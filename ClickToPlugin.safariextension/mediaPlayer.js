if(location.href !== "about:blank") {

/***************************
mediaPlayer class definition
****************************/

function mediaPlayer() {
	
	// this.playerType; // audio or video
	this.playlist = [];
	this.playlistLength = 0; // not necessarily synced with playlist.length!
	
	// this.startTrack; // internal start track is always 0
	// when startTrack is set, createMediaElement can be called
	// this.currentTrack; // for the user, current track is startTrack + currentTrack + 1
	// currentTrack is set iff loadTrack has been called
	// this.currentSource; // the source being used for the currentTrack (an integer)
	
	// this.containerElement;
	// this.mediaElement; // the HTML video/audio element
	
	// Shadow DOM
	this.shadowDOM = {};
	
	// Dimensions of the container
	// this.width;
	// this.height;
	
	// this.contextInfo;
	// this.playlistControls; // boolean
	
	// Additional HTML elements
	// this.trackSelector;
	// this.sourceSelector;
}

mediaPlayer.prototype.handleMediaData = function(mediaData) {
	if(mediaData.loadAfter) { // just adding stuff to the playlist
		this.playlist = this.playlist.concat(mediaData.playlist);
		if(this.trackSelector) this.addToPlaylist(mediaData.playlist);
	} else { // initial mediaData
		this.playerType = mediaData.isAudio ? "audio" : "video";
		this.playlist = mediaData.playlist.concat(this.playlist);
		this.playlistLength = mediaData.playlistLength ? mediaData.playlistLength : mediaData.playlist.length;
		this.currentSource = mediaData.playlist[0].defaultSource;
		this.startTrack = mediaData.startTrack ? mediaData.startTrack : 0;
		this.playlistControls = !mediaData.noPlaylistControls && this.playlistLength > 1 && this.currentSource !== undefined;
	}
};

mediaPlayer.prototype.createMediaElement = function(width, height, style, contextInfo) {
	this.containerElement = document.createElement("div");
	this.containerElement.className = "CTFmediaPlayer";
	this.containerElement.tabIndex = -1; // make focusable
	this.containerElement.addEventListener("click", function(event) {event.stopPropagation();}, false);
	
	var styleElement = document.createElement("style"); // use scoped attribute when supported
	this.containerElement.appendChild(styleElement);
	
	this.mediaElement = document.createElement(this.playerType);
	this.mediaElement.className = "CTFmediaElement";
	this.mediaElement.id = "CTFmediaElement" + contextInfo.elementID;
	this.mediaElement.setAttribute("controls", "");
	switch(settings.initialBehavior) {
		case "none":
			this.mediaElement.setAttribute("preload", "none");
			break;
		case "buffer":
			this.mediaElement.setAttribute("preload", "auto");
			break;
		case "autoplay":
			this.mediaElement.setAttribute("preload", "auto");
			this.mediaElement.setAttribute("autoplay", "");
			break;
	}
	this.containerElement.appendChild(this.mediaElement);
	
	// Set dimensions & CSS
	this.width = width;
	this.height = height;
	this.containerElement.style.width = width + "px !important";
	this.containerElement.style.height = height + "px !important";
	this.mediaElement.style.width = width + "px";
	this.mediaElement.style.height = height + "px";
	applyCSS(this.containerElement, style, ["position", "top", "right", "bottom", "left", "z-index", "clear", "float", "margin-top", "margin-right", "margin-bottom", "margin-left", "-webkit-margin-before-collapse", "-webkit-margin-after-collapse"]);
	
	// Set volume
	this.mediaElement.volume = settings.volume;
	
	// Set global contextInfo
	this.contextInfo = contextInfo;
	
	// Set listeners
	var _this = this;
	this.mediaElement.addEventListener("contextmenu", function(event) {
		_this.setContextInfo(event, contextInfo);
		event.stopPropagation();
	}, false);
	this.mediaElement.addEventListener("loadedmetadata", function() {_this.handleLoadedMetadataEvent();}, false);
	this.mediaElement.addEventListener("ended", function() {_this.handleEndedEvent();}, false);
	
	// Additional controls
	if(this.playlist[0].title || this.playlistControls) this.initializeTrackSelector();
	if(this.playlistControls) this.initializePlaylistControls();
	if(settings.showSourceSelector) this.initializeSourceSelector();
	
	// Set keyboard shortcuts
	this.registerShortcuts();
};

mediaPlayer.prototype.initializeShadowDOM = function() {
	var stylesheet = this.containerElement.firstChild.sheet;
	var pseudoElements = {"controlsPanel": "-webkit-media-controls-panel", "playButton": "-webkit-media-controls-play-button", "muteButton": "-webkit-media-controls-mute-button", "rewindButton": "-webkit-media-controls-rewind-button", "fullscreenButton": "-webkit-media-controls-fullscreen-button", "timelineContainer": "-webkit-media-controls-timeline-container", "volumeSliderContainer": "-webkit-media-controls-volume-slider-container", "volumeSlider": "-webkit-media-controls-volume-slider", "statusDisplay": "-webkit-media-controls-status-display", "seekBackButton": "-webkit-media-controls-seek-back-button", "seekForwardButton": "-webkit-media-controls-seek-forward-button"};//, "toggleClosedCaptionsButton": "-webkit-media-controls-toggle-closed-captions-button", "timeline": "-webkit-media-controls-timeline", "currentTimeDisplay": "-webkit-media-controls-current-time-display", "timeRemainingDisplay": "-webkit-media-controls-time-remaining-display", "returnToRealtimeButton": "-webkit-media-controls-return-to-realtime-button"};
	
	for(var e in pseudoElements) {
		stylesheet.insertRule("#CTFmediaElement" + this.contextInfo.elementID + ":not(:-webkit-full-screen)::" + pseudoElements[e] + "{}", 0);
		this.shadowDOM[e] = stylesheet.cssRules[0];
	}
	
	// Status display
	if(this.trackSelector) this.shadowDOM.statusDisplay.style.display = "none";
	
	// Rewind button
	if(settings.hideRewindButton) this.shadowDOM.rewindButton.style.display = "none";
	
	// Playlist controls
	if(this.playlistControls) {
		// Re-order controls
		this.shadowDOM.rewindButton.style.WebkitBoxOrdinalGroup = "1";
		this.shadowDOM.seekBackButton.style.WebkitBoxOrdinalGroup = "2";
		this.shadowDOM.playButton.style.WebkitBoxOrdinalGroup = "3";
		this.shadowDOM.seekForwardButton.style.WebkitBoxOrdinalGroup = "4";
		this.shadowDOM.statusDisplay.style.WebkitBoxOrdinalGroup = "5";
		this.shadowDOM.timelineContainer.style.WebkitBoxOrdinalGroup = "6";
		this.shadowDOM.muteButton.style.WebkitBoxOrdinalGroup = "7";
		this.shadowDOM.fullscreenButton.style.WebkitBoxOrdinalGroup = "9";
		
		// Show back/forward buttons
		this.shadowDOM.seekBackButton.style.display = "-webkit-box";
		this.shadowDOM.seekBackButton.style.marginLeft = "6px";
		this.shadowDOM.seekBackButton.style.width = "20px";
		this.shadowDOM.seekBackButton.style.height = "12px";
		this.shadowDOM.playButton.style.marginRight = "6px";
		this.shadowDOM.seekForwardButton.style.display = "-webkit-box";
		this.shadowDOM.seekForwardButton.style.width = "20px";
		this.shadowDOM.seekForwardButton.style.height = "12px";
	}
};

mediaPlayer.prototype.initializeTrackSelector = function() {
	this.trackSelector = document.createElement("select");
	this.trackSelector.className = "CTFtrackSelector";
	this.containerElement.appendChild(this.trackSelector);
	this.statusDisplay = document.createElement("span");
	this.statusDisplay.textContent = LOADING + "\u2002";
	
	if(this.playlistLength === 1) {
		this.trackSelector.classList.add("CTFdisabled");
		var option = document.createElement("option");
		option.textContent = this.playlist[0].title;
		this.trackSelector.appendChild(option);
		return;
	}
	this.addToPlaylist(this.playlist);
	
	var _this = this;
	this.trackSelector.addEventListener("change", function(event) {
		_this.loadTrack(parseInt(event.target.value), 3);
	}, false);
	this.trackSelector.addEventListener("mousedown", function() {_this.showTrackSelector(false);}, false);
	if(settings.showTitleShortcut && settings.showTitleShortcut.type === "keydown") { // override keydown shortcuts
		this.trackSelector.addEventListener("keydown", function(event) {
			if((event.keyIdentifier === "U+0020" || event.keyIdentifier === "Up" || event.keyIdentifier === "Down") && !event.shiftKey && !event.metaKey && !event.altKey && !event.ctrlKey) event.allowDefault = true;
		}, false);
	}
};

mediaPlayer.prototype.showTrackSelector = function(isLoading) {
	var leftOffset = 0;
	if(isLoading) {
		leftOffset = 53;
		if(this.shadowDOM.rewindButton.style.display === "none") leftOffset -= 26;
		if(this.playlistControls) leftOffset += 52;
		this.shadowDOM.controlsPanel.style.width = leftOffset + "px";
		this.shadowDOM.fullscreenButton.style.display = "none";
		this.shadowDOM.volumeSliderContainer.style.display = "none";
		this.shadowDOM.muteButton.style.display = "none";
		this.shadowDOM.timelineContainer.style.display = "none";
	} else {
		if(this.statusDisplay.parentNode !== null) this.statusDisplay.parentNode.removeChild(this.statusDisplay);
		this.shadowDOM.controlsPanel.style.display = "none";
	}
	
	this.trackSelector.style.left = leftOffset + "px !important";
	this.trackSelector.style.width = (this.width - leftOffset) + "px !important";
	this.trackSelector.style.display = "block !important";
};

mediaPlayer.prototype.hideTrackSelector = function() {
	this.trackSelector.style.display = "none !important";
	this.shadowDOM.timelineContainer.style.removeProperty("display");
	this.shadowDOM.muteButton.style.removeProperty("display");
	this.shadowDOM.volumeSliderContainer.style.removeProperty("display");
	this.shadowDOM.fullscreenButton.style.removeProperty("display");
	this.shadowDOM.controlsPanel.style.width = this.width + "px";
	this.shadowDOM.controlsPanel.style.removeProperty("display");
};

mediaPlayer.prototype.initializePlaylistControls = function() {
	var _this = this;
	var x = 26;
	if(settings.hideRewindButton) x = 0;
	this.containerElement.addEventListener("click", function(event) {
		var coord = _this.getCoordinates(event);
		if(coord.y + 25 > _this.height) { // click in controls
			if(coord.x >= x + 6 && coord.x <= x + 25) {
				event.preventDefault();
				_this.prevTrack();
			} else if(coord.x >= x + 54 && coord.x <= x + 73) {
				event.preventDefault();
				_this.nextTrack();
			}
		}
	}, false);
};

mediaPlayer.prototype.initializeSourceSelector = function() {
	var _this = this;
	this.sourceSelector = new sourceSelector(this.contextInfo.plugin,
		function(event) {restorePlugin(_this.contextInfo.elementID);},
		function(event) {viewInQuickTimePlayer(_this.contextInfo.elementID);},
		function(event, source) {_this.switchSource(source);},
		function(event, source) {_this.setContextInfo(event, _this.contextInfo, source);}
	);
	
	this.containerElement.appendChild(this.sourceSelector.containerElement);
	
	// Cancel mouseout to source selector
	this.containerElement.addEventListener("mouseout", function(event) {
		if(event.target === _this.mediaElement && event.relatedTarget && event.relatedTarget.compareDocumentPosition(this) === 10) event.preventDefault();
	}, false);
};

mediaPlayer.prototype.handleLoadedMetadataEvent = function() {
	if(this.trackSelector && this.statusDisplay.parentNode !== null) {
		this.hideTrackSelector();
		this.statusDisplay.parentNode.removeChild(this.statusDisplay);
	}
};

mediaPlayer.prototype.handleEndedEvent = function() {
	if(!this.mediaElement.hasAttribute("loop")) {
		var track = this.currentTrack;
		while(track + this.startTrack + 1 < this.playlistLength) {
			++track;
			if(this.playlist[track] === undefined) break;
			if(this.playlist[track] !== null) {
				this.loadTrack(track, 1);
				break;
			}
		}
	}
};

mediaPlayer.prototype.nextTrack = function() {
	var track = this.currentTrack;
	do {
		track = this.normalizeTrack(track + 1);
	} while(this.playlist[track] === null);
	if(track === this.currentTrack) return;
	this.loadTrack(track, 3);
};

mediaPlayer.prototype.prevTrack = function() {
	var track = this.currentTrack;
	do {
		track = this.normalizeTrack(track - 1);
	} while(this.playlist[track] === null);
	if(track === this.currentTrack) return;
	this.loadTrack(track, 3);
};

mediaPlayer.prototype.normalizeTrack = function(track) {
	track = track % this.playlist.length;
	if(track < 0) track += this.playlist.length; // stupid JS behavior
	return track;
};

mediaPlayer.prototype.setPoster = function() {
	if(this.playlist[this.currentTrack].poster) {
		if(this.playlist[this.currentTrack].sources[this.currentSource].mediaType === "video") {
			this.mediaElement.poster = this.playlist[this.currentTrack].poster;
			this.containerElement.style.backgroundImage = "none !important";
		} else {
			if(this.mediaElement.hasAttribute("poster")) this.mediaElement.removeAttribute("poster");
			this.containerElement.style.backgroundImage = "url('" + this.playlist[this.currentTrack].poster + "') !important";
		}
	} else {
		if(this.mediaElement.hasAttribute("poster")) this.mediaElement.removeAttribute("poster");
		this.containerElement.style.backgroundImage = "none !important";
	}
};

mediaPlayer.prototype.loadTrack = function(track, init, source) { // init: two-digit binary number (focus/autoplay)
	if(source === undefined) source = this.playlist[track].defaultSource;
	
	this.mediaElement.pause();
	this.mediaElement.src = this.playlist[track].sources[source].url;
	// If src is not set before poster, poster is not shown. Webkit bug?
	this.currentTrack = track;
	this.currentSource = source;
	this.setPoster();
	if(init === 1 || init === 3) {
		this.mediaElement.setAttribute("preload", "auto");
		this.mediaElement.setAttribute("autoplay", "");
	}
	if(init === 2 || init === 3) this.containerElement.focus();
	
	if(this.trackSelector) {
		this.hideTrackSelector();
		this.trackSelector.value = track;
		if(this.mediaElement.preload === "auto") {
			var option = this.trackSelector[this.trackSelector.selectedIndex];
			option.insertBefore(this.statusDisplay, option.firstChild);
		}
		this.showTrackSelector(true);
	}
	
	if(this.sourceSelector) {
		this.sourceSelector.hide();
		this.sourceSelector.buildSourceList(this.playlist[track].sources);
		this.sourceSelector.setCurrentSource(source);
		this.sourceSelector.unhide(this.width, this.height);
	}
	//alert(getComputedStyle(this.mediaElement, ":-webkit-media-controls-status-display").getPropertyValue("width"))
};

mediaPlayer.prototype.switchSource = function(source) {
	if(source === this.currentSource) return;
	
	this.sourceSelector.setCurrentSource(source);
	
	var currentTime = this.mediaElement.currentTime;
	this.hideTrackSelector();
	this.mediaElement.pause();
	this.mediaElement.src = this.playlist[this.currentTrack].sources[source].url;
	this.currentSource = source;
	this.setPoster();
	this.mediaElement.setAttribute("preload", "auto");
	this.mediaElement.setAttribute("autoplay", "");
	if(this.trackSelector) {
		var option = this.trackSelector[this.trackSelector.selectedIndex];
		option.insertBefore(this.statusDisplay, option.firstChild);
		this.showTrackSelector(true);
	}
	this.containerElement.focus();
	
	var setInitialTime = function(event) {
		event.target.removeEventListener("loadedmetadata", setInitialTime, false);
		event.target.currentTime = currentTime;
	};
	this.mediaElement.addEventListener("loadedmetadata", setInitialTime, false);
};

mediaPlayer.prototype.toggleLooping = function() {
	if(this.mediaElement.hasAttribute("loop")) this.mediaElement.removeAttribute("loop");
	else this.mediaElement.setAttribute("loop", "true");
};

mediaPlayer.prototype.setContextInfo = function(event, contextInfo, source) {
	var track = this.currentTrack;
	if(track === undefined) track = 0;
	if(source === undefined) source = this.currentSource;
	contextInfo.siteInfo = this.playlist[track].siteInfo;
	contextInfo.hasMedia = true;
	contextInfo.isMedia = this.currentTrack !== undefined;
	contextInfo.source = source;
	if(source !== undefined) contextInfo.mediaType = this.playlist[track].sources[source].mediaType;
	safari.self.tab.setContextMenuEventUserInfo(event, contextInfo);
};

mediaPlayer.prototype.printTrack = function(track) {
	return (track + this.startTrack) % this.playlistLength + 1;
};

mediaPlayer.prototype.addToPlaylist = function(playlist) {
	var firstTrack = this.trackSelector.querySelector("[value='0']");
	var start = this.trackSelector.childNodes.length;
	for(var i = 0; i < playlist.length; i++) {
		var option = document.createElement("option");
		var track = i + start;
		option.value = track;
		var title = "[" + this.printTrack(track) + "/" + this.playlistLength + "]\u2002";
		if(playlist[i] === null) option.disabled = true;
		else if(playlist[i].title) title += playlist[i].title;
		//if(!title) title = "(no title)";
		option.textContent = title;
		if(firstTrack === null) firstTrack = option;
		if(this.printTrack(track) <= this.startTrack) this.trackSelector.insertBefore(option, firstTrack);
		else this.trackSelector.appendChild(option);
	}
};

mediaPlayer.prototype.registerShortcuts = function() {
	var _this = this;
	if(settings.playPauseShortcut) {
		this.addEventListener(settings.playPauseShortcut.type, function(event) {
			if(testShortcut(event, settings.playPauseShortcut)) {
				if(_this.mediaElement.paused) _this.mediaElement.play();
				else _this.mediaElement.pause();
			}
		});
	}
	if(settings.enterFullscreenShortcut) {
		this.addEventListener(settings.enterFullscreenShortcut.type, function(event) {
			if(testShortcut(event, settings.enterFullscreenShortcut)) {
				if(_this.mediaElement.webkitDisplayingFullscreen) _this.mediaElement.webkitExitFullscreen();
				else _this.mediaElement.webkitEnterFullscreen();
			}
		});
	}
	if(settings.volumeUpShortcut) {
		this.addEventListener(settings.volumeUpShortcut.type, function(event) {
			if(testShortcut(event, settings.volumeUpShortcut)) {
				var newVolume = _this.mediaElement.volume + .1;
				if(newVolume > 1) _this.mediaElement.volume = 1;
				else _this.mediaElement.volume = newVolume;
			}
		});
	}
	if(settings.volumeDownShortcut) {
		this.addEventListener(settings.volumeDownShortcut.type, function(event) {
			if(testShortcut(event, settings.volumeDownShortcut)) {
				var newVolume = _this.mediaElement.volume - .1;
				if(newVolume < 0) _this.mediaElement.volume = 0;
				else _this.mediaElement.volume = newVolume;
			}
		});
	}
	if(this.playlistControls) {
		if(settings.prevTrackShortcut) {
			this.addEventListener(settings.prevTrackShortcut.type, function(event) {
				if(testShortcut(event, settings.prevTrackShortcut)) _this.prevTrack();
			});
		}
		if(settings.nextTrackShortcut) {
			this.addEventListener(settings.nextTrackShortcut.type, function(event) {
				if(testShortcut(event, settings.nextTrackShortcut)) _this.nextTrack();
			});
		}
	}
	if(settings.toggleLoopingShortcut) {
		this.addEventListener(settings.toggleLoopingShortcut.type, function(event) {
			if(testShortcut(event, settings.toggleLoopingShortcut)) _this.toggleLooping();
		});
	}
	if(this.trackSelector && settings.showTitleShortcut) {
		this.addEventListener(settings.showTitleShortcut.type, function(event) {
			event.allowDefault = false;
			if(testShortcut(event, settings.showTitleShortcut)) {
				if(_this.trackSelector.style.display === "none") {
					_this.showTrackSelector(false);
					_this.trackSelector.focus();
				} else {
					_this.hideTrackSelector();
					_this.containerElement.focus();
				}
			}
		});
	}
};

mediaPlayer.prototype.addEventListener = function(type, handler) {
	if(type === "click" || type === "dblclick") { // ignore clicks on controls
		var _this = this;
		this.containerElement.addEventListener(type, function(event) {
			if(!(event.target === this || event.target.hasAttribute("controls")) || event.offsetY + _this.mediaElement.offsetTop + 25 > _this.height) return;
			handler(event);
		}, false);
	} else {
		this.containerElement.addEventListener(type, handler, false);
	}
};

mediaPlayer.prototype.getCoordinates = function(event) {
	var x = event.offsetX, y = event.offsetY;
	var e = event.target;
	do {
		if(e === this.containerElement) break;
		x += e.offsetLeft;
		y += e.offsetTop;
	} while(e = e.offsetParent);
	return {"x": x, "y": y};
};

}
