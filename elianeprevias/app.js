(function () {
      'use strict';

      const LINK_DESTINO = 'https://t.me/elianefenn';
      const TEMPO_PREVIA_IMAGEM = 3000;
      const TEMPO_PREVIA_VIDEO = 3000;
      const TEMPO_MAXIMO_CARREGAMENTO = 15000;
      const PREVIEW_STORAGE_KEY = 'elianeFenViewedPreviewsV5';

      const viewer = document.getElementById('preview-viewer');
      const viewerTitle = document.getElementById('viewer-title');
      const viewerImage = document.getElementById('viewer-image');
      const viewerVideo = document.getElementById('viewer-video');
      const viewerMessage = document.getElementById('viewer-message');
      const mainAccess = document.getElementById('main-access');
      const mobileAccess = document.getElementById('mobile-access');
      const mobileButton = mobileAccess.querySelector('.cta');
      const mobileQuery = window.matchMedia('(max-width: 640px)');
      const profileAvatar = document.getElementById('profile-avatar');
      const profileViewer = document.getElementById('profile-viewer');
      const privacyShield = document.getElementById('privacy-shield');
      const viewerPrev = document.getElementById('viewer-prev');
      const viewerNext = document.getElementById('viewer-next');
      const previewCards = Array.from(document.querySelectorAll('.preview'));
      const sessionPreviewIds = new Set();

      let currentPreviewIndex = -1;
      let closeTimer = 0;
      let loadTimer = 0;
      let trigger = null;
      let mainButtonVisible = false;
      let videoPlayCount = 0;
      let profileCloseTimer = 0;

      function closeProfileViewer() {
        clearTimeout(profileCloseTimer);
        profileCloseTimer = 0;

        if (!profileViewer.hasAttribute('open')) return;

        if (typeof profileViewer.close === 'function') {
          profileViewer.close();
        } else {
          profileViewer.removeAttribute('open');
          document.body.classList.remove('profile-open');
        }
      }

      function openProfileViewer() {
        clearTimeout(profileCloseTimer);

        if (typeof profileViewer.showModal === 'function') {
          profileViewer.showModal();
        } else {
          profileViewer.setAttribute('open', '');
        }

        document.body.classList.add('profile-open');
        profileCloseTimer = setTimeout(closeProfileViewer, 3000);
      }

      profileViewer.addEventListener('close', function () {
        clearTimeout(profileCloseTimer);
        profileCloseTimer = 0;
        document.body.classList.remove('profile-open');
      });

      profileViewer.addEventListener('cancel', function (event) {
        event.preventDefault();
        closeProfileViewer();
      });

      profileAvatar.addEventListener('click', openProfileViewer);

      profileAvatar.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          openProfileViewer();
        }
      });

      profileViewer.addEventListener('click', function (event) {
        if (event.target === profileViewer) {
          closeProfileViewer();
        }
      });

      document.querySelectorAll('[data-access]').forEach(function (link) {
        link.href = LINK_DESTINO;
      });

      document.querySelectorAll('.avatar img, .preview img').forEach(function (image) {
        function hideMissingImage() {
          image.style.visibility = 'hidden';
        }

        image.addEventListener('error', hideMissingImage);

        if (image.complete && image.naturalWidth === 0) {
          hideMissingImage();
        }
      });

      document.querySelectorAll('img, video').forEach(function (media) {
        media.draggable = false;
      });

      document.addEventListener('contextmenu', function (event) {
        if (event.target.closest('img, video, .preview, .avatar')) {
          event.preventDefault();
        }
      });

      document.addEventListener('dragstart', function (event) {
        if (event.target.matches('img, video')) {
          event.preventDefault();
        }
      });

      document.addEventListener('keydown', function (event) {
        const key = String(event.key || '').toLowerCase();
        const protectedShortcut = (event.ctrlKey || event.metaKey) && (key === 's' || key === 'p');

        if (protectedShortcut || event.key === 'PrintScreen') {
          event.preventDefault();
          showPrivacyShield();
          closeViewer();
          closeProfileViewer();
          setTimeout(hidePrivacyShield, 1200);
        }
      });

      function loadViewedPreviews() {
        try {
          const saved = JSON.parse(localStorage.getItem(PREVIEW_STORAGE_KEY) || '[]');
          return new Set(Array.isArray(saved) ? saved.map(String) : []);
        } catch (error) {
          return new Set();
        }
      }

      const viewedPreviews = loadViewedPreviews();

      function saveViewedPreviews() {
        try {
          localStorage.setItem(PREVIEW_STORAGE_KEY, JSON.stringify(Array.from(viewedPreviews)));
        } catch (error) {
          /* O site continua funcionando se o armazenamento estiver bloqueado. */
        }
      }

      function lockPreviewCard(card) {
        if (!card) return;

        const id = card.dataset.previewId;
        const label = card.querySelector('.locked-label');
        const statusIcon = card.querySelector('.lock-circle use');

        card.classList.add('preview-viewed');
        card.disabled = true;
        card.removeAttribute('data-loading');
        card.setAttribute('aria-disabled', 'true');
        card.setAttribute('aria-label', 'Prévia ' + id + ' já visualizada');

        if (label) {
          label.textContent = 'Prévia visualizada';
        }

        if (statusIcon) {
          statusIcon.setAttribute('href', '#viewed-check');
        }
      }

      function markPreviewAsViewed(card) {
        const id = String(card.dataset.previewId);

        if (!viewedPreviews.has(id)) {
          viewedPreviews.add(id);
          saveViewedPreviews();
        }

        sessionPreviewIds.add(id);
        lockPreviewCard(card);
        updateViewerNavigation();
      }

      function updateMobileButton() {
        const shouldShow = mobileQuery.matches && !mainButtonVisible;

        mobileAccess.hidden = !shouldShow;
        document.body.classList.toggle('has-mobile-access', shouldShow);
        mainAccess.classList.toggle('telegram-in-view', mainButtonVisible);
        mobileButton.classList.toggle('telegram-in-view', shouldShow);

        if (shouldShow) {
          requestAnimationFrame(function () {
            const barHeight = Math.ceil(mobileAccess.getBoundingClientRect().height + 18);
            document.body.style.setProperty('--mobile-bar-height', barHeight + 'px');
          });
        } else {
          document.body.style.removeProperty('--mobile-bar-height');
        }
      }

      function calculateMainButtonVisibility() {
        const rect = mainAccess.getBoundingClientRect();
        mainButtonVisible = rect.bottom > 0 && rect.top < window.innerHeight;
        updateMobileButton();
      }

      if ('IntersectionObserver' in window) {
        const accessObserver = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (entry.target !== mainAccess) return;
            mainButtonVisible = entry.isIntersecting && entry.intersectionRatio >= .25;
            updateMobileButton();
          });
        }, { threshold: [0, .25] });

        accessObserver.observe(mainAccess);
      } else {
        let ticking = false;

        function requestVisibilityUpdate() {
          if (ticking) return;
          ticking = true;

          requestAnimationFrame(function () {
            calculateMainButtonVisibility();
            ticking = false;
          });
        }

        window.addEventListener('scroll', requestVisibilityUpdate, { passive: true });
        window.addEventListener('resize', requestVisibilityUpdate);
        calculateMainButtonVisibility();
      }

      if (typeof mobileQuery.addEventListener === 'function') {
        mobileQuery.addEventListener('change', updateMobileButton);
      } else if (typeof mobileQuery.addListener === 'function') {
        mobileQuery.addListener(updateMobileButton);
      }

      function showPrivacyShield() {
        privacyShield.classList.add('is-active');
      }

      function hidePrivacyShield() {
        privacyShield.classList.remove('is-active');
      }

      document.addEventListener('visibilitychange', function () {
        document.body.classList.toggle('page-hidden', document.hidden);

        if (document.hidden) {
          showPrivacyShield();

          if (!viewerVideo.paused) {
            viewerVideo.pause();
          }

          closeViewer();
          closeProfileViewer();
        } else {
          setTimeout(hidePrivacyShield, 180);
        }
      });

      window.addEventListener('blur', function () {
        if (viewer.hasAttribute('open') || profileViewer.hasAttribute('open')) {
          showPrivacyShield();
          closeViewer();
          closeProfileViewer();
        }
      });

      window.addEventListener('focus', function () {
        setTimeout(hidePrivacyShield, 180);
      });

      function clearViewerTimers() {
        clearTimeout(closeTimer);
        clearTimeout(loadTimer);
        closeTimer = 0;
        loadTimer = 0;
      }

      function resetViewer() {
        clearViewerTimers();

        viewerImage.onload = null;
        viewerImage.onerror = null;
        viewerImage.removeAttribute('src');
        viewerImage.hidden = true;
        viewerImage.style.visibility = 'hidden';

        viewerVideo.oncanplay = null;
        viewerVideo.onerror = null;
        viewerVideo.onended = null;
        viewerVideo.onclick = null;
        viewerVideo.pause();
        viewerVideo.removeAttribute('src');
        viewerVideo.load();
        viewerVideo.hidden = true;

        document.body.classList.remove('preview-open');

        if (trigger) {
          trigger.removeAttribute('data-loading');

          if (!trigger.disabled) {
            try {
              trigger.focus({ preventScroll: true });
            } catch (error) {
              trigger.focus();
            }
          }
        }

        trigger = null;
        videoPlayCount = 0;
        currentPreviewIndex = -1;
        sessionPreviewIds.clear();
        viewerPrev.hidden = true;
        viewerNext.hidden = true;
      }

      function closeViewer() {
        if (!viewer.hasAttribute('open')) return;

        if (typeof viewer.close === 'function') {
          viewer.close();
        } else {
          viewer.removeAttribute('open');
          resetViewer();
        }
      }

      function openViewer() {
        if (typeof viewer.showModal === 'function') {
          viewer.showModal();
        } else {
          viewer.setAttribute('open', '');
        }

        document.body.classList.add('preview-open');
      }

      viewer.addEventListener('close', resetViewer);
      viewer.querySelector('.close-viewer').addEventListener('click', closeViewer);

      viewer.addEventListener('click', function (event) {
        if (event.target === viewer) {
          closeViewer();
        }
      });

      function showLoadFailure(text, wait) {
        clearTimeout(loadTimer);
        viewerMessage.textContent = text;
        closeTimer = setTimeout(closeViewer, wait);
      }

      function loadImagePreview(card, source, id) {
        viewerVideo.hidden = true;
        viewerImage.hidden = false;
        viewerImage.style.visibility = 'hidden';
        viewerImage.alt = 'Prévia ' + id;

        viewerImage.onload = function () {
          clearTimeout(loadTimer);
          viewerImage.onload = null;
          viewerImage.onerror = null;
          viewerImage.style.visibility = 'visible';
          viewerMessage.textContent = 'Aproveite a prévia ✨';
          markPreviewAsViewed(card);
          closeTimer = setTimeout(closeViewer, TEMPO_PREVIA_IMAGEM);
        };

        viewerImage.onerror = function () {
          viewerImage.onload = null;
          viewerImage.onerror = null;
          showLoadFailure('Esta prévia está indisponível no momento.', TEMPO_PREVIA_IMAGEM);
        };

        loadTimer = setTimeout(function () {
          viewerImage.onload = null;
          viewerImage.onerror = null;
          showLoadFailure('A imagem demorou demais para carregar.', TEMPO_PREVIA_IMAGEM);
        }, TEMPO_MAXIMO_CARREGAMENTO);

        viewerImage.src = source;
      }

      function playVideoSafely() {
        const playPromise = viewerVideo.play();

        if (playPromise && typeof playPromise.catch === 'function') {
          playPromise.catch(function () {
            viewerMessage.textContent = 'Toque no vídeo para iniciar a prévia.';
            viewerVideo.onclick = playVideoSafely;
          });
        }
      }

      function loadVideoPreview(card, source, id) {
        viewerImage.hidden = true;
        viewerVideo.hidden = false;
        viewerVideo.muted = true;
        viewerVideo.playsInline = true;
        viewerVideo.currentTime = 0;

        function failVideo() {
          viewerVideo.oncanplay = null;
          viewerVideo.onerror = null;
          viewerVideo.onended = null;
          showLoadFailure('Não foi possível carregar este vídeo. Use MP4 em H.264 para maior compatibilidade.', TEMPO_PREVIA_VIDEO);
        }

        viewerVideo.oncanplay = function () {
          viewerVideo.oncanplay = null;
          clearTimeout(loadTimer);
          viewerMessage.textContent = 'Aproveite a prévia ✨';
          markPreviewAsViewed(card);
          videoPlayCount = 1;

          if (id === '6') {
            viewerVideo.onended = function () {
              if (videoPlayCount < 2) {
                videoPlayCount += 1;
                viewerVideo.currentTime = 0;
                playVideoSafely();
              } else {
                closeViewer();
              }
            };
          } else {
            closeTimer = setTimeout(closeViewer, TEMPO_PREVIA_VIDEO);
          }

          playVideoSafely();
        };

        viewerVideo.onerror = failVideo;
        loadTimer = setTimeout(failVideo, TEMPO_MAXIMO_CARREGAMENTO);
        viewerVideo.src = source;
        viewerVideo.load();
      }

      function canNavigateToCard(card) {
        if (!card) return false;
        const id = String(card.dataset.previewId);
        return !viewedPreviews.has(id) || sessionPreviewIds.has(id);
      }

      function findNavigableIndex(direction) {
        let index = currentPreviewIndex + direction;

        while (index >= 0 && index < previewCards.length) {
          if (canNavigateToCard(previewCards[index])) {
            return index;
          }
          index += direction;
        }

        return -1;
      }

      function updateViewerNavigation() {
        if (!viewer.hasAttribute('open') || currentPreviewIndex < 0) {
          viewerPrev.hidden = true;
          viewerNext.hidden = true;
          return;
        }

        viewerPrev.hidden = findNavigableIndex(-1) === -1;
        viewerNext.hidden = findNavigableIndex(1) === -1;
      }

      function prepareViewerForPreviewSwitch() {
        clearViewerTimers();

        viewerImage.onload = null;
        viewerImage.onerror = null;

        viewerVideo.oncanplay = null;
        viewerVideo.onerror = null;
        viewerVideo.onended = null;
        viewerVideo.onclick = null;
        viewerVideo.pause();

        if (trigger) {
          trigger.removeAttribute('data-loading');
        }
      }

      function showPreviewCard(card, keepSession) {
        if (!card) return;

        const id = String(card.dataset.previewId);
        if (!keepSession && viewedPreviews.has(id)) return;
        if (keepSession && !canNavigateToCard(card)) return;

        const thumbnail = card.querySelector('img');
        const videoSource = card.dataset.video || '';
        const isVideo = Boolean(videoSource);
        const mediaSource = isVideo ? videoSource : thumbnail && thumbnail.getAttribute('src');

        if (!mediaSource) return;

        if (!keepSession) {
          sessionPreviewIds.clear();
        }

        prepareViewerForPreviewSwitch();
        card.dataset.loading = 'true';
        trigger = card;
        currentPreviewIndex = previewCards.indexOf(card);
        viewerTitle.textContent = isVideo ? 'Prévia em vídeo ' + id : 'Prévia ' + id;
        viewerMessage.textContent = 'Carregando prévia…';

        if (!viewer.hasAttribute('open')) {
          openViewer();
        }

        updateViewerNavigation();

        if (isVideo) {
          loadVideoPreview(card, mediaSource, id);
        } else {
          loadImagePreview(card, mediaSource, id);
        }
      }

      function navigateExpandedPreview(direction) {
        const nextIndex = findNavigableIndex(direction);
        if (nextIndex === -1) return;
        showPreviewCard(previewCards[nextIndex], true);
      }

      viewerPrev.addEventListener('click', function (event) {
        event.stopPropagation();
        navigateExpandedPreview(-1);
      });

      viewerNext.addEventListener('click', function (event) {
        event.stopPropagation();
        navigateExpandedPreview(1);
      });

      document.addEventListener('keydown', function (event) {
        if (!viewer.hasAttribute('open')) return;

        if (event.key === 'ArrowLeft' && !viewerPrev.hidden) {
          event.preventDefault();
          navigateExpandedPreview(-1);
        } else if (event.key === 'ArrowRight' && !viewerNext.hidden) {
          event.preventDefault();
          navigateExpandedPreview(1);
        }
      });

      previewCards.forEach(function (card) {
        const id = String(card.dataset.previewId);

        if (viewedPreviews.has(id)) {
          lockPreviewCard(card);
          return;
        }

        card.addEventListener('click', function () {
          if (card.disabled || card.dataset.loading === 'true' || viewedPreviews.has(id)) {
            return;
          }

          showPreviewCard(card, false);
        });
      });

      updateMobileButton();
    }());
