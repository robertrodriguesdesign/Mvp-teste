(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var screens = ['lobbyScreen', 'callScreen', 'endedScreen', 'errorScreen'];
  function showScreen(id) {
    screens.forEach(function (s) { $(s).classList.toggle('is-active', s === id); });
  }
  function showError(msg) {
    $('errorMessage').textContent = msg;
    showScreen('errorScreen');
  }

  var roomId = location.pathname.replace(/\/+$/, '').split('/').filter(Boolean).pop();
  var SLUG_RE = /^[a-z0-9]{2,6}-[a-z0-9]{2,6}-[a-z0-9]{2,6}$/;
  if (!roomId || !SLUG_RE.test(roomId)) {
    showError('Link de reunião inválido.');
    return;
  }

  var LK = window.LivekitClient;
  var state = {
    micOn: true,
    camOn: true,
    localStream: null,
    room: null,
    meeting: null
  };

  /* ---------- Carrega metadados da sala ---------- */
  fetch('/api/meet-token?roomId=' + encodeURIComponent(roomId))
    .then(function (r) {
      if (r.status === 404) throw { code: 404 };
      if (r.status === 410) throw { code: 410 };
      if (!r.ok) throw { code: r.status };
      return r.json();
    })
    .then(function (data) {
      state.meeting = data;
      $('meetingTitle').textContent = data.title || 'Fihan Meet';
      $('meetingSub').textContent = 'Digite seu nome para entrar.';
      $('callTitle').textContent = data.title || 'Fihan Meet';
      startPreview();
    })
    .catch(function (err) {
      if (err && err.code === 404) return showError('Essa sala não existe. Confira o link com quem te convidou.');
      if (err && err.code === 410) return showError('Essa reunião já foi encerrada.');
      showError('Não foi possível carregar a sala. Tente novamente em instantes.');
    });

  /* ---------- Preview de câmera/microfone no lobby ---------- */
  function startPreview() {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      $('previewPlaceholder').textContent = 'Este navegador não suporta câmera/microfone.';
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      .then(function (stream) {
        state.localStream = stream;
        var video = $('previewVideo');
        video.srcObject = stream;
        video.style.display = '';
        $('previewPlaceholder').style.display = 'none';
      })
      .catch(function () {
        $('previewPlaceholder').textContent = 'Câmera/microfone bloqueados. Você ainda pode entrar só com áudio ou texto.';
      });
  }

  function setLobbyToggle(btn, on, iconOn, iconOff) {
    btn.classList.toggle('is-off', !on);
    btn.querySelector('img').src = on ? iconOn : iconOff;
  }
  $('toggleMicLobby').addEventListener('click', function () {
    state.micOn = !state.micOn;
    if (state.localStream) state.localStream.getAudioTracks().forEach(function (t) { t.enabled = state.micOn; });
    setLobbyToggle($('toggleMicLobby'), state.micOn, '/images/icons/microphone-01.svg', '/images/icons/microphone-off-01.svg');
  });
  $('toggleCamLobby').addEventListener('click', function () {
    state.camOn = !state.camOn;
    if (state.localStream) state.localStream.getVideoTracks().forEach(function (t) { t.enabled = state.camOn; });
    setLobbyToggle($('toggleCamLobby'), state.camOn, '/images/icons/video-recorder.svg', '/images/icons/video-recorder-off.svg');
  });

  /* ---------- Nome + entrar ---------- */
  var nameInput = $('guestName');
  var joinBtn = $('joinBtn');
  nameInput.addEventListener('input', function () {
    joinBtn.disabled = nameInput.value.trim().length < 1;
  });
  nameInput.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !joinBtn.disabled) join();
  });
  joinBtn.addEventListener('click', join);

  function join() {
    var name = nameInput.value.trim();
    if (!name) return;
    joinBtn.disabled = true;
    joinBtn.textContent = 'Entrando…';
    $('lobbyError').classList.remove('is-visible');

    fetch('/api/meet-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: roomId, name: name })
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.body.error || 'Não foi possível entrar.');
        return connectRoom(res.body, name);
      })
      .catch(function (err) {
        joinBtn.disabled = false;
        joinBtn.textContent = 'Entrar na reunião';
        $('lobbyError').textContent = err.message || 'Falha ao entrar. Tente novamente.';
        $('lobbyError').classList.add('is-visible');
      });
  }

  /* ---------- Sala LiveKit ---------- */
  var tiles = {}; // participant.sid -> tile element

  function initials(name) {
    return (name || '?').trim().charAt(0).toUpperCase();
  }

  function ensureTile(participant, isLocal) {
    var sid = participant.sid || 'local';
    if (tiles[sid]) return tiles[sid];
    var tile = document.createElement('div');
    tile.className = 'tile' + (isLocal ? ' is-local' : '');
    tile.innerHTML =
      '<div class="tile__avatar">' + initials(participant.name || participant.identity) + '</div>' +
      '<span class="tile__label">' + (isLocal ? (participant.name || 'Você') + ' (você)' : (participant.name || 'Convidado')) + '</span>';
    $('videoGrid').appendChild(tile);
    tiles[sid] = tile;
    return tile;
  }
  function removeTile(participant) {
    var sid = participant.sid;
    if (tiles[sid]) { tiles[sid].remove(); delete tiles[sid]; }
  }
  function attachTrack(participant, track, isLocal) {
    var tile = ensureTile(participant, isLocal);
    var avatar = tile.querySelector('.tile__avatar');
    if (track.kind === LK.Track.Kind.Video) {
      var el = track.attach();
      el.autoplay = true; el.playsInline = true;
      tile.insertBefore(el, tile.firstChild);
      if (avatar) avatar.style.display = 'none';
    } else {
      track.attach(); // audio: no visual element needed, browser plays it
    }
  }
  function detachTrack(track) {
    track.detach().forEach(function (el) { el.remove(); });
  }

  function connectRoom(tokenData, name) {
    var room = new LK.Room({ adaptiveStream: true, dynacast: true });
    state.room = room;

    room.on(LK.RoomEvent.ParticipantConnected, function (p) { ensureTile(p, false); });
    room.on(LK.RoomEvent.ParticipantDisconnected, function (p) { removeTile(p); });
    room.on(LK.RoomEvent.TrackSubscribed, function (track, publication, participant) {
      attachTrack(participant, track, false);
    });
    room.on(LK.RoomEvent.TrackUnsubscribed, function (track) { detachTrack(track); });
    room.on(LK.RoomEvent.LocalTrackPublished, function (publication) {
      if (publication.track) attachTrack(room.localParticipant, publication.track, true);
    });
    room.on(LK.RoomEvent.Disconnected, function () {
      showScreen('endedScreen');
    });
    room.on(LK.RoomEvent.ConnectionStateChanged, function (stateNow) {
      $('callStatus').textContent = stateNow === 'connected' ? 'conectado' : stateNow;
    });

    return room.connect(tokenData.wsUrl, tokenData.token)
      .then(function () {
        ensureTile(room.localParticipant, true);
        return Promise.all([
          room.localParticipant.setMicrophoneEnabled(state.micOn),
          room.localParticipant.setCameraEnabled(state.camOn)
        ]);
      })
      .then(function () {
        if (state.localStream) state.localStream.getTracks().forEach(function (t) { t.stop(); });
        showScreen('callScreen');
        setLobbyToggle($('toggleMicCall'), state.micOn, '/images/icons/microphone-01.svg', '/images/icons/microphone-off-01.svg');
        setLobbyToggle($('toggleCamCall'), state.camOn, '/images/icons/video-recorder.svg', '/images/icons/video-recorder-off.svg');
      });
  }

  $('toggleMicCall').addEventListener('click', function () {
    if (!state.room) return;
    state.micOn = !state.micOn;
    state.room.localParticipant.setMicrophoneEnabled(state.micOn);
    setLobbyToggle($('toggleMicCall'), state.micOn, '/images/icons/microphone-01.svg', '/images/icons/microphone-off-01.svg');
  });
  $('toggleCamCall').addEventListener('click', function () {
    if (!state.room) return;
    state.camOn = !state.camOn;
    state.room.localParticipant.setCameraEnabled(state.camOn);
    setLobbyToggle($('toggleCamCall'), state.camOn, '/images/icons/video-recorder.svg', '/images/icons/video-recorder-off.svg');
  });
  $('leaveBtn').addEventListener('click', function () {
    if (state.room) state.room.disconnect();
    else showScreen('endedScreen');
  });

  window.addEventListener('beforeunload', function () {
    if (state.room) state.room.disconnect();
  });
})();
