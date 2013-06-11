(function(NNA, $){
	
	NNA.VideoControls = Class.extend({
		init: function(container, videoPlayer, options){
			// configurable options
			this.options = {
				scrubUpdateFramerate: 10,      // framerate for updating the scrub bar
				animationDuration: 250,        // animation duration for fading in controls
				arrowAnimationDuration: 500,   // animation duration for fading arrows
				showFirstChapterMarker: true,  // include or exclude first chapter in scrub bar
				controlHotZone: 20,            // vertical mouse distance away from controls before they are shown or hidden
				arrowHotZone: 0.10,            // percentage distance from edge of screen where the users mouse must be to show arrows
				scrubberFunction: 0            // 0 = SEEK BY CHAPTER, 1 = SEEK ANYWHERE
			};
			$.extend(true, this.options, options);

			// class attributes
			this.videoPlayer = videoPlayer;
			this.container = $(container);
			this.scrubWrapper = this.container.find('.scrub_wrapper').eq(0);
			this.scrub = this.scrubWrapper.find('.scrub').eq(0);
			this.scrubLoaded = this.scrubWrapper.find('.scrub_loaded').eq(0);
			this.scrubPlayed = this.scrubWrapper.find('.scrub_played').eq(0);
			this.chapterThumbnail = this.container.find('.chapter_thumbnail').eq(0);
			this.arrowPrevious = $('#chapter_arrows .previous').fadeOut(0);
			this.arrowNext = $('#chapter_arrows .next').fadeOut(0);
			this.isVisible = false;
			this.hasEnded = false;
			this.inTakeover = false;
			this.isPausedWithAutoResume = false;
			this.chapters = [];
			this.currentChapter = null;

			// init
			this.attach();
			this.subscribe();
			this.initScrub();
			this.initChapterThumbnails();
			if(Modernizr.touch) this.show(0);

			debug.log('NNA.VideoControls: initialized');
		},

		// attach event handlers to dom and video player
		attach: function(){
			var self = this;

			// play pause toggle
			this.container.on('click', '.play', $.proxy(this.togglePlay, this));
			this.videoPlayer.addEvent('play', $.proxy(this.updatePlay, this));
			this.videoPlayer.addEvent('pause', $.proxy(this.updatePlay, this));
			this.videoPlayer.addEvent('ended', $.proxy(this.onEnded, this));

			// when the duration changes update the chapters
			this.videoPlayer.addEvent('durationchange', $.proxy(this.updateChapters, this));

			// track mousemovement to show and hide controls
			if(!Modernizr.touch){
				$(document.body).on('mousemove', $.throttle(250, function(e){
					//self.updateArrows(e.pageX);
					self.updateVisibility(e.pageY);
				}));
			}
		},

		// set up subscriptions this object will respond to
		subscribe: function(){
			var self = this;

			// get updates about the current chapter to know when arrows need to be shown or hidden
			$.subscribe('/nna/videofeature/events/chapter', function(e, chapterEvent){
				self.currentChapter = chapterEvent;
			});

			// need to know when in takeover
			$.subscribe('/nna/videofeature/setTakeover', function(){ self.inTakeover = true; });
			$.subscribe('/nna/videofeature/unsetTakeover', function(){ self.inTakeover = false; });

			// need to know if paused with auto resume
			$.subscribe('/nna/videofeature/play', function(){ self.isPausedWithAutoResume = false; });
			$.subscribe('/nna/videofeature/events/pause', function(e, pauseEvent){
				if(pauseEvent.autoResumeAfter !== undefined) self.isPausedWithAutoResume = true;
			});

			// arrows will need to be aware of when the video has reached the end event
			$.subscribe('/nna/videofeature/events/end', function(e, chapterEvent){
				self.hasEnded = true;
				self.videoPlayer.addEvent('play', function(e){
					self.videoPlayer.removeEvent('play', arguments.callee);
					self.hasEnded = false;
				});
				self.updateArrows();
			});
		},

		// toggle play state
		togglePlay: function(){
			if(this.videoPlayer.paused()) this.videoPlayer.play();
			else this.videoPlayer.pause();
		},

		// update play pause indicator and arrows on play
		updatePlay: function(){
			// update play/pause button
			if(this.videoPlayer.paused()) this.container.find('.play').removeClass('playing');
			else this.container.find('.play').addClass('playing');

			// arrows also need to be updated
			this.updateArrows();
		},
		onEnded: function(){
			var self = this;
			debug.log("Video END Event",this.videoPlayer)
			$.publish('/nna/videofeature/events/end');

			// user clicked play when video was at end. We should restart at the first chapter.
			$.publish('/nna/videofeature/seekChapter', [self.chapters[0]['id']]); 
		},

		// add chapters to the scrub bar
		addChapters: function(chapters){
			this.chapters = $.grep(chapters, function(event){
				if(event.type === 'CHAPTER') return true;
				else return false;
			});
			if(this.videoPlayer.duration() !== 0) this.updateChapters();
		},

		// clear chapters from scrub bar
		clearChapters: function(){
			this.chapters = [];
			this.updateChapters();
		},

		// draw chapters in scrub bar
		updateChapters: function(){
			// total video duration
			var duration = this.videoPlayer.duration() * 1000;
			var scrubWidth = this.scrub.width();

			// clear previous chapters
			this.scrub.find('ul li').remove();
			this.scrubLoaded.find('ul li').remove();
			this.scrubPlayed.find('ul li').remove();

			// add new chapters only if duration is not currently reporting 0
			// start at 1 so the first chapter is not shown
			for(var i = this.options.showFirstChapterMarker ? 0 : 1; i < this.chapters.length && duration !== 0; i ++){
				var chapter = this.chapters[i];
				var chapterTimecode = chapter.timecode;
				var chapterPosition = Math.round((chapterTimecode * scrubWidth) / duration) + 'px';
				var chapterElement = $('<li>' + (i + 1) + '</li>').css('left', chapterPosition);
				chapterElement.data('chapterData', chapter);
				this.scrub.children('ul').append(chapterElement.clone(true));
				this.scrubLoaded.children('ul').append(chapterElement.clone(true));
				this.scrubPlayed.children('ul').append(chapterElement.clone(true));
			}
		},

		// set up chapter thumbnails on the scrub bar
		initChapterThumbnails: function(){
			var self = this;

			// do not do on touch devices
			if(Modernizr.touch) return;

			// chapter hover
			this.scrubWrapper.on('mouseenter', 'ul li', function(e){
				// get chapter data and offset position
				var chapterData = $(this).data('chapterData');
				var offset = self.scrubWrapper.offset().left - self.container.offset().left;

				// update image and copy
				self.chapterThumbnail.find('img').attr({ src: chapterData['thumbnail'], alt: chapterData['label'] });
				self.chapterThumbnail.find('div.label').html(chapterData['label']);

				// position and show
				self.chapterThumbnail.css({ display: 'block', left: $(this).position().left + offset });
			}).on('mouseleave', 'ul li', function(e){
				// hide chapter thumbnail
				self.chapterThumbnail.css({ display: 'none' });
			});
		},

		// set up the scrub bar so it is uniformly updated
		initScrub: function(){
			var self = this;

			// make calls to video player frequently so scrub bar can be updated
			this.scrubInterval = setInterval($.proxy(this.updateScrub, this), 1000 / this.options.scrubUpdateFramerate);

			// scrubbing move to chapter you clicked in
			if(this.options.scrubberFunction === 0){
				this.scrubWrapper.on('mousedown', function(e){
					e.preventDefault();
					var element = $(this);
					var scrubWidth = element.width();
					var scrubOffset = element.offset().left;
					var positionX = e.clientX - scrubOffset;
					var requestedTime = ((positionX * self.videoPlayer.duration()) / element.width()) * 1000;

					$.publish('/nna/placement/scrub');

					// find chapter you just clicked in
					for(var i = 0; i < self.chapters.length; i++){
						// last chapter
						if(i === self.chapters.length - 1){
							$.publish('/nna/videofeature/seekChapter', [self.chapters[i]['id']]);
							break;
						}
						// other chapters
						else{
							if(requestedTime > self.chapters[i].timecode && requestedTime < self.chapters[i + 1].timecode){
								$.publish('/nna/videofeature/seekChapter', [self.chapters[i]['id']]);
								break;
							}
						}
					}
				});
			}
			// standard scrubbing move to exactly where you clicked
			else if(this.options.scrubberFunction === 1){
				this.scrubWrapper.on('mousedown touchstart', function(e){
					e.preventDefault();
					var element = $(this);
					var scrubWidth = element.width();
					var scrubOffset = element.offset().left;
					var positionX = e.clientX - scrubOffset;
					var requestedTime = (positionX * self.videoPlayer.duration()) / element.width();
					self.videoPlayer.currentTime(requestedTime);
					self.doScrub = true;
				}).on('mouseup mouseleave touchend', function(e){
					self.doScrub = false;
				}).on('mousemove', function(e){
					if(self.doScrub){
						var element = $(this);
						var scrubWidth = element.width();
						var scrubOffset = element.offset().left;
						var positionX = e.clientX - scrubOffset;
						var requestedTime = (positionX * self.videoPlayer.duration()) / element.width();
						self.videoPlayer.currentTime(requestedTime);
					}
				});
			}

			// clicking chapter markers will skip to chapter
			this.scrubWrapper.on('mousedown touchstart', 'ul li', function(e){
				// stop any propegation to prevent click handler on underlying scrub bar from being fired
				e.stopImmediatePropagation();
				e.preventDefault();

				$.publish('/nna/placement/scrub');

				// seek to the requested chapter
				var chapterData = $(this).data('chapterData');
				$.publish('/nna/videofeature/seekChapter', [chapterData['id']]);
			});
		},

		// stop scrub bar updating
		stopScrub: function(){
			clearInterval(this.scrubInterval);
		},

		// update the scrub bar
		updateScrub: function(){
			var duration = this.videoPlayer.duration();
			var currentTime = this.videoPlayer.currentTime();
			var playPercent = (currentTime / duration) * 100;
			var bufferPercent = this.videoPlayer.bufferedPercent();
			this.scrubLoaded.css({ width: bufferPercent + '%' });
			this.scrubPlayed.css({ width: playPercent + '%' });
		},

		// show and hide controls based on mouse position
		updateVisibility: function(mouseY){
			// top and bottom of controls
			var top = this.container.position().top;
			var bottom = top + this.container.height();

			// show and hide within a certain distance from controls
			if(mouseY >= top - this.options.controlHotZone && mouseY <= bottom + this.options.controlHotZone){
				if(!this.isVisible) this.show();
			}else{
				if(this.isVisible) this.hide();
			}
		},

		// update visiblity of arrows based on current mouse position and state of video player
		updateArrows: function(mouseX){
			// states used to determine if arrows are shown or hidden this probably beaks with 0-1 chapters but I don't care
			if(mouseX === undefined) mouseX = this.lastMouseX;
			else this.lastMouseX = mouseX;
			var isPaused = this.videoPlayer.paused();
			var wrapperWidth = $('#wrapper').width();
			var distanceFromEdge = wrapperWidth * this.options.arrowHotZone;
			var chapterIndex = $.inArray(this.currentChapter, this.chapters);
			var hasNextChapter = chapterIndex !== this.chapters.length - 1;
			var hasPreviousChapter = chapterIndex > 0;
			var duration = NNA.BROWSER.isOldIE ? 0 : this.options.arrowAnimationDuration;

			// determine if arrows need to be shown or hidden
			var showNext = false;
			var showPrevious = false;
			if(isPaused){
				if(this.isPausedWithAutoResume){
					//if(mouseX > wrapperWidth - distanceFromEdge && hasNextChapter) showNext = true;
					//if(mouseX < distanceFromEdge && hasPreviousChapter) showPrevious = true;
				}else{
					showNext = true;
					if(hasPreviousChapter) showPrevious = true;
				}
			}else{
				// when not paused arrows are only shown when mouse is on edge of window
				//if(mouseX < distanceFromEdge && hasPreviousChapter) showPrevious = true;
				//if(mouseX > wrapperWidth - distanceFromEdge && hasNextChapter) showNext = true;
			}

			// on touch devices arrows always shown
			if(Modernizr.touch){
				showNext = true;
				showPrevious = true;
			}

			// show and hide arrows with nice animation
			if(showNext){
				this.arrowNext.stop(true, false).queue(function(){
					$(this).css('display', 'block').dequeue();
				}).animate({
					opacity: 1
				}, duration);
			}else{
				this.arrowNext.stop(true, false).animate({
					opacity: 0
				}, duration).queue(function(){
					$(this).css('display', 'none').dequeue();
				});
			}

			if(showPrevious){
				this.arrowPrevious.stop(true, false).queue(function(){
					$(this).css('display', 'block').dequeue();
				}).animate({
					opacity: 1
				}, duration);
			}else{
				this.arrowPrevious.stop(true, false).animate({
					opacity: 0
				}, duration).queue(function(){
					$(this).css('display', 'none').dequeue();
				});
			}

			// update copy below arrows this will do a nice fade between whatever copy needs to be shown or hidden
			var showEnd = this.hasEnded === true ? true : false;
			var showContinue = this.inTakeover === true && showEnd !== true;
			if(showEnd){
				this.arrowNext.find('.next_journey').stop(true, false).queue(function(){
					$(this).css('display', 'block').dequeue();
				}).animate({
					opacity: 1
				}, duration);
			}else{
				this.arrowNext.find('.next_journey').animate({
					opacity: 0
				}, duration).queue(function(){
					$(this).css('display', 'none').dequeue();
				});
			}

			if(showContinue){
				this.arrowNext.find('.continue_journey').stop(true, false).queue(function(){
					$(this).css('display', 'block').dequeue();
				}).animate({
					opacity: 1
				}, duration);
			}else{
				this.arrowNext.find('.continue_journey').animate({
					opacity: 0
				}, duration).queue(function(){
					$(this).css('display', 'none').dequeue();
				});
			}
		},

		// show controls
		show: function(duration){
			if(!this.isVisible){
				if(duration === undefined) duration = this.options.animationDuration;
				if(NNA.BROWSER.isOldIE) duration = 0; // cant animate because of png issues
				this.container.stop(true, false).animate({ opacity: 1 }, duration);
				this.isVisible = true;
			}
		},

		// hide controls
		hide: function(duration){
			if(this.isVisible){
				if(duration === undefined) duration = this.options.animationDuration;
				if(NNA.BROWSER.isOldIE) duration = 0; // cant animate because of png issues
				this.container.stop(true, false).animate({ opacity: 0 }, duration);
				this.isVisible = false;
			}
		}
	});
	
})(NNA, jQuery);