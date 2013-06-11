(function(NNA, $){
	
	NNA.VideoFeature = Class.extend({
		init: function(videoContainer, videoData, options){
			// configurable options
			this.options = {
				nextPage: null,
				updateInterval: 80,
				updateDebug: true,
				crapPerformanceThreshold: 200
			};
			$.extend(true, this.options, options);

			// class attributes
			this.bodyElement = $(document.body);
			this.videoContainer = $(videoContainer);
			this.videoPlayer = null;
			this.videoControls = null;
			this.videoData = videoData;
			this.isRunning = false;
			this.hasEnded = false;
			this.loadedChapters = [];
			this.autoClearedTimeouts = [];
			this.currentChapter = null;
			this.currentTakeover = null;
			this.contentElements = $('article');
			this.modalPaused = false;

			// a paramater in the url can be used to deeplink to a chapter on page load
			this.chapterOnReady = NNA.Utils.getParam('chapter') === '' ? null : NNA.Utils.getParam('chapter');

			// store chapters with and without markers for later use
			this.chaptersWithMarkers = this.getChapters();
			this.chapters = $.grep(this.chaptersWithMarkers, function(event){
				if(event.type === 'CHAPTER') return true;
				else return false;
			});

			// init
			this.initVideoPlayer();

			debug.log('NNA.VideoFeature: initialized');
		},

		// attach event handlers
		attach: function(){
			var self = this;

			// chapter navigation
			this.bodyElement.on('click', '.next_chapter', function(e){
				e.preventDefault();
				$.publish('/nna/videofeature/nextChapter');
			}).on('click', '.previous_chapter', function(e){
				e.preventDefault();
				$.publish('/nna/videofeature/previousChapter');
			}).on('click', '.restart_chapter', function(e){
				e.preventDefault();
				$.publish('/nna/videofeature/restartChapter');
			}).on('click', '.continue', function(e){
				e.preventDefault();
				$.publish('/nna/placement/continue');
			}).on('click', '.replay', function(e){
				e.preventDefault();
				$.publish('/nna/placement/replay');
			});

			// video player events
			this.videoPlayer.addEvent('play', function(){
				$.publish('/nna/videofeature/play');
				self.startUpdate();
			});
			this.videoPlayer.addEvent('pause', $.proxy(this.stopUpdate, this));
		},

		// initialize the video player
		initVideoPlayer: function(){
			var self = this;

			// load a lower quality video for android or iOS devices
			var videoFiles = this.videoData.files.high;
			if(NNA.BROWSER.isIOS || NNA.BROWSER.isAndroid) videoFiles = this.videoData.files.low;

			// init videoplayer show loader while doing so to hide page shifting around
			$.publish('/nna/effects/showLoading');
			new NNA.FullScreenVideoPlayer(videoFiles, this.videoContainer, {
				onReady: function(videoPlayer){
					self.videoPlayer = videoPlayer;
					self.onReady();
				}
			});
		},

		// init subscriptions this class will respond to
		initSubscriptions: function(){
			var self = this;

			$.subscribe('/nna/videofeature/seekChapter', function(e, id){ self.seekChapter(id); });
			$.subscribe('/nna/videofeature/nextChapter', function(e, id){ self.nextChapter(); });
			$.subscribe('/nna/videofeature/previousChapter', function(e, id){ self.previousChapter(); });
			$.subscribe('/nna/videofeature/restartChapter', function(e, id){ self.restartChapter(); });
			$.subscribe('/nna/modalShowLoading', function(){
				if(self.isRunning === true){
					self.modalPaused = true;
					self.videoPlayer.pause();
				}
			});
			$.subscribe('/nna/modalCloseComplete', function(){
				if(self.modalPaused === true){
					self.modalPaused = false;
					self.videoPlayer.play();
				}				
			});
		},

		// set a timeout that is automatically cleared on video seeks
		setAutoClearedTimeout: function(f, delay){
			var timeout = setTimeout(f, delay);
			this.autoClearedTimeouts.push(timeout);
			return timeout;
		},

		// clears array of timeouts intedented to be used to clear timeouts when seeking
		clearTimeouts: function(){
			for(var i = 0; i < this.autoClearedTimeouts; i++){
				clearTimeout(this.autoClearedTimeouts[i]);
			}
			this.autoClearedTimeouts = [];
		},

		// queue up the video for this feature and play it
		onReady: function(){
			var self = this;

			this.videoControls = new NNA.VideoControls('#video_controls', this.videoPlayer);
			this.videoControls.addChapters(this.chapters);
			this.initSubscriptions();
			this.attach();

			// check if audio should be muted or not
			var audioCookie = NNA.Utils.getCookie('audioMuted');
			if(audioCookie === 'YES') this.videoPlayer.volume(0);
			else this.videoPlayer.volume(1);

			// start at the beginning of a chapters
			if(this.chapterOnReady !== null){
				// Safari Fix - [NNA-1564]
				setTimeout(function(){ self.videoPlayer.play(); }, 0);

				// once the videodata has loaded at the beginning of a video we can seek
				this.videoPlayer.addEvent('loadeddata', function(){
					self.videoPlayer.removeEvent('loadeddata', arguments.callee);

					// store duration of video used to detect end
					self.videoDuration = self.videoPlayer.duration() * 1000;
					debug.log('NNA.VideoFeature: video is ' + self.videoDuration + 'ms');

					// this is here because the falsh player cant size the video properly if we do this stuff too soon
					setTimeout(function(){
						self.seekChapter(self.chapterOnReady);
						var lastCurrentTime;
						self.videoPlayer.addEvent('timeupdate', function(e){
							var currentTime = self.videoPlayer.currentTime();
							if(currentTime > lastCurrentTime && lastCurrentTime !== undefined){
								self.videoPlayer.removeEvent('timeupdate', arguments.callee);
								$.publish('/nna/effects/hideLoading');
							}
							lastCurrentTime = currentTime;
						});
					}, NNA.BROWSER.isIpad ? 1000 : 5);
				});
			}
			// start at beginning of video
			else{
				this.videoPlayer.addEvent('loadeddata', function(){
					self.videoPlayer.removeEvent('loadeddata', arguments.callee);

					// store duration of video used to detect end
					self.videoDuration = self.videoPlayer.duration() * 1000;
					debug.log('NNA.VideoFeature: video is ' + self.videoDuration + 'ms');

					$.publish('/nna/effects/hideLoading');
				});

				// Safari Fix - [NNA-1564]
				setTimeout(function(){ self.videoPlayer.play(); }, 0);
			}
		},

		// start update loop this gives a better time resolution than using the timeupdate event
		startUpdate: function(){
			var self = this;

			// for debugging
			if(self.options.updateDebug){
				this.lastUpdate = new Date();
				this.totalUpdateTime = self.options.updateInterval;
				this.updateCount = 1;
				this.averageUpdateTime = 0;
			}

			// the update function
			var updateFunction = function(){
				var videoTime = self.videoPlayer.currentTime();
				var timecode = Math.round(videoTime * 1000);
				self.checkEvent(timecode);

				// for debugging
				if(self.options.updateDebug){
					// calculate an average time between function calls
					self.totalUpdateTime += new Date().getTime() - self.lastUpdate.getTime();
					self.averageUpdateTime = Math.round(self.totalUpdateTime / self.updateCount);
					self.updateCount++;
					self.lastUpdate = new Date();
					
					// take a sample after a certain number of updates have completed
					// if a crappy level of performance is detected do something about it
					if(self.updateCount > 50 && self.averageUpdateTime > self.options.crapPerformanceThreshold){
						self.options.updateDebug = false;
						$.publish('/nna/videofeature/slowPerformance', [self.averageUpdateTime]);
						debug.log('NNA.VideoFeature: slow performance detected update interval of ' + self.averageUpdateTime);
					}
				}
			};

			// start update loop
			this.updateInterval = setInterval(updateFunction, this.options.updateInterval);

			// first run
			updateFunction();

			// add class to body to indicate playing
			this.bodyElement.removeClass('video_paused');

			// this should be done when restarting playback
			this.unsetTakeover();
			this.clearTimeouts();

			// indicate update is running
			this.isRunning = true;
		},

		// stop update loop
		stopUpdate: function(){
			// stop update loop
			clearInterval(this.updateInterval);

			// remove class from body that indicates playing
			this.bodyElement.addClass('video_paused');

			// inidcate update is not running
			this.isRunning = false;
		},

		// update loop looks for events based on current video time
		checkEvent: function(timecode){
			// determine which events need to be processed on this update
			this.fromIndex = this.fromIndex === undefined ? 0 : this.fromIndex;
			this.toIndex = 0;
			for(var i = this.fromIndex; i <= this.videoData.timeline.length; i++){
				var timelineEvent = this.videoData.timeline[i];
				// last event is treated differently than the other events
				if(timelineEvent === undefined || timelineEvent.timecode > timecode){
					this.toIndex = i;
					break;
				}
			}

			// process each of the events between the last update and current update that have no been processed
			if(this.fromIndex !== this.toIndex){
				var eventsToProcess = this.videoData.timeline.slice(this.fromIndex, this.toIndex);
				for(var i = 0; i < eventsToProcess.length; i++){
					debug.log('EVENT:' + eventsToProcess[i]['type'], 'WHEN:' + eventsToProcess[i]['timecode'], 'DETECTED AT:' + timecode);
					this.processEvent(eventsToProcess[i]);
				}
			}

			// automatically fire off an end event if at end of video
			/*if(timecode >= this.videoDuration - 500){
				this.processEvent({ timecode: timecode, type: 'END' });
			}*/

			// store index of the last processed event
			this.fromIndex = this.toIndex;
		},

		// process the various types of events
		processEvent: function(timelineEvent){
			switch(timelineEvent['type']){
				case 'CHAPTER':
					this.eventChapter(timelineEvent);
					break;
				case 'MARKER':
					this.eventMarker(timelineEvent);
					break;
				case 'PAUSE':
					this.eventPause(timelineEvent);
					break;
				case 'SHOW':
					this.eventShow(timelineEvent);
					break;
				case 'HIDE':
					this.eventHide(timelineEvent);
					break;
				case 'FLASH':
					this.eventFlash(timelineEvent);
					break;
				case 'END':
					this.eventEnd(timelineEvent);
					break;
				case 'EXTERIOR360':
					this.eventExterior360(timelineEvent);
					break;
				case 'INTERIORPANO':
					if(!$('html').hasClass('no-flash')) this.eventInteriorPano(timelineEvent);
					break;
				case 'SBW':
					this.eventSteerByWire(timelineEvent);
					break;				
				case 'HEADLIGHTS':
					this.eventHeadlights(timelineEvent);
					break;				
				case 'SAFETYSHIELD':
					this.eventSafetyShield(timelineEvent);
					break;
				case 'EOC':
					this.eventEndOfChapter(timelineEvent);
					break;
			}
		},
		
		// handle chapter start event
		eventChapter: function(event){
			this.currentChapter = event;
			$.publish('/nna/videofeature/events/chapter', [event,this.chapterOnReady]);
		},

		// handle marker event
		eventMarker: function(event){
			$.publish('/nna/videofeature/events/marker', [event]);
		},

		// handle pause event
		eventPause: function(event){
			// TEMPORARY FIX IE CRASHES IF EVEN USES AUTO RESUME
			if(NNA.BROWSER.isOldIE && event.autoResumeAfter) return;

			// do pause
			this.videoPlayer.pause();

			// auto resume
			if(event.autoResumeAfter){
				this.setAutoClearedTimeout($.proxy(function(){
					this.videoPlayer.play();
				}, this), event.autoResumeAfter);
			}

			$.publish('/nna/videofeature/events/pause', [event]);
		},

		// handle end event
		eventEnd: function(event){
			var self = this;
			this.videoPlayer.pause();
			this.videoPlayer.addEvent('play', function(e){
				self.videoPlayer.removeEvent('play', arguments.callee);
				self.hasEnded = false;
			});
			this.hasEnded = true;
			$.publish('/nna/videofeature/events/end', [event]);
		},

		// handle flash event
		eventFlash: function(event){
			$.publish('/nna/videofeature/events/flash', [event]);
			$.publish('/nna/effects/flash');
		},

		// handle show content event
		eventShow: function(event){
			// animate visible
			$(event.selector).stop(true, false).show().addClass('show', event.duration, event.easing || 'swing');

			// publish event
			$.publish('/nna/videofeature/events/show', [event]);
		},

		// handle hide content event
		eventHide: function(event){
			// animate hidden
			$(event.selector).stop(true, false).removeClass('show', event.duration, event.easing || 'swing', function(){
				$(this).hide();
			});

			// publish event
			$.publish('/nna/videofeature/events/hide', [event]);
		},

		// handle external 360 event
		eventExterior360: function(event){
			var self = this;

			// takeover's setup function
			var setup = function(event){
				// required elements
				var element = $(event.selector);
				var threesixtyElement = element.find('.threesixty').eq(0);
				var hintElement = threesixtyElement.find('.hint').eq(0);
				var loadingElement = element.find('.loading').eq(0);

				// set to loading state
				element.show().addClass('show');
				loadingElement.show();
				threesixtyElement.hide();

				// generate list of images
				var imageList = [];
				for(var i = 0; i < event.frames; i++){
					var index = (i < 10) ? "0"+i : i;
					imageList.push(event.prefix + index + event.suffix);
				}
				
				// preload all images
				NNA.Utils.preloadImages(imageList).done(function(imagesPreloaded){
					// fix image flickering in firefox
					self.firefoxFlickerFix(imagesPreloaded);

					// make the 360 visible
					threesixtyElement.fadeIn(NNA.BROWSER.isOldIE ? 0 : 200);

					// threesixty is only created the first time and is reused later
					var threesixty = threesixtyElement.data('ThreeSixty');
					if(threesixty === undefined){
						threesixtyElement.threesixty({
							imageList: imageList,
							useBuiltInLoader: false,
							width: 960,
							height: 540,
							frameSteps: 8,
							startFrame : event.startFrame,
							reverse: true,
							redrawOnResize: true,
							parentElement: element,
							onLoadComplete: function(){
								hintElement.show();
							},
							onRotate: function(){
								hintElement.hide();
								$.publish('/nna/videofeature/designExterior360Rotate');
							},
							onRotateEnd : function(frame, isAutoPlay){
								//hintElement.show();
							}
						});
					}else{
						threesixty.currentFrame = event.startFrame;
						threesixty.updateFrame();
						hintElement.show();
					}

					// 360 is ready can now hide it's loading indicator
					loadingElement.hide();
				}).fail(function(){
					// pretend that nothing happened and let the video keep playing
					element.removeClass('show').hide();
					self.videoPlayer.play();
				});
			};

			// takeover's destroy function
			var destroy = function(event){
				$(event.selector).fadeOut(NNA.BROWSER.isOldIE ? 0 : 400, function(){
					$(this).removeClass('show').hide();
				});
			};

			// set the current takeover
			this.setTakeover(event, setup, destroy);

			// publish event
			$.publish('/nna/videofeature/events/exterior360', [event]);
		},

		// handle interior pano event
		eventInteriorPano: function(event){
			// takeover's setup function
			var setup = function(event){
				var element = $(event.selector);
				element.show().addClass('show');
				var panorama = new NNA.Panorama(element.find('.pano_wrapper'));
			};

			// takeover's destroy function
			var destroy = function(event){
				$.publish('/nna/effects/flash', [300]);
				setTimeout(function(){
					var element = $(event.selector);
					//panorama.destroy();
					element.removeClass('show').hide();
				}, 150);
			};

			// set the current takeover
			this.setTakeover(event, setup, destroy);

			// publish event
			$.publish('/nna/videofeature/events/interiorPano', [event]);
		},

		// handle Headlights
		eventHeadlights: function(event){
			var self = this;

			// takeover's setup function
			var setup = function(event){
				// collect elements
				var element = $(event.selector);
				var imageswitcherElement = element.find('.image-switcher').eq(0);
				var loadingElement = element.find('.loading').eq(0);
				var imageswitcher = imageswitcherElement.data('ImageSwitcher');
				var copyElement = element.find('.default-copy');
				
				// set up loading state
				imageswitcherElement.hide();
				copyElement.hide();
				element.show().addClass('show');
				loadingElement.show();

				// threesixty shoudl be hidden while loading is shown
				imageswitcherElement.hide();

				// switches frames
				function switchFrame(frm){	
					if(imageswitcher){
						imageswitcher.currentFrame = frm;
						imageswitcher.updateFrame();
					}
				}

				// preload images
				NNA.Utils.preloadImages(event.frames).done(function(imagesPreloaded){
					// fix image flickering in firefox
					self.firefoxFlickerFix(imagesPreloaded);

					// show image switcher and controls and hide the loader
					imageswitcherElement.fadeIn(NNA.BROWSER.isOldIE ? 0 : 200);
					copyElement.delay(200).fadeIn(NNA.BROWSER.isOldIE ? 0 : 1500);
					loadingElement.hide();
					
					// init the imageswitcher on first run
					if(imageswitcher === undefined){
						imageswitcherElement.imageswitcher({
							imageList: event.frames,
							useBuiltInLoader: false,
							width: 1280,
							height: 720,
							startFrame : event.startFrame,
							redrawOnResize: true,
							parentElement: element
						});

						imageswitcher = imageswitcherElement.data('ImageSwitcher');

						// click handler for light icons does selection and switches frames
						element.on('click', 'ul.headlight_controls li', function(e){
							var iconElement = $(this);
							var index = iconElement.index();
							iconElement.addClass('selected').siblings('.selected').removeClass('selected');
							switchFrame(index);
							$.publish('/nna/videofeature/headlightInteraction', [index]);

						});
					}
					// set back to start state first option selected
					else{
						element.find('ul.headlight_controls li').eq(0).trigger('click');
					}
				}).fail(function(){
					// pretend nothing happened and carry on
					element.removeClass('show').hide();
					self.videoPlayer.play();
				});
			};

			// takeover's destroy function
			var destroy = function(event){
				$(event.selector).fadeOut(NNA.BROWSER.isOldIE ? 0 : 200, function(){
					$(this).removeClass('show').hide();
				});
			};

			// set the current takeover
			this.setTakeover(event, setup, destroy);

			// publish event
			$.publish('/nna/videofeature/events/headlights', [event]);
		},

		// handle Steer By Wire event
		eventSteerByWire: function(event){
			var self = this;

			// takeover's setup function
			var setup = function(event){
				var element = $(event.selector);
				var copyBlock = element.find('.default-copy').eq(0);
				var imageSwitcherElement = element.find('.image_switcher').eq(0);
				var imageSwitcher = imageSwitcherElement.data('ImageSwitcher');
				var label = element.find('h2.settings_label').eq(0);
				var steeringEffort = element.find('h3').eq(0);
				var settings = element.find('ul.settings').eq(0);
				var efforts = element.find('ul.efforts').eq(0);
				var imageSwitcherElement = element.find('.image_switcher').eq(0);
				var loadingElement = element.find('.loading').eq(0);
				var lastMouseX = 0;

				// show steer by wire in default state
				element.addClass('show').show();
				element.children().hide();
				copyBlock.hide().fadeIn(NNA.BROWSER.isOldIE ? 0 : 500);

				// clicking button launches steer by wire
				element.on('click.sbw', '.launch', function(){
					initSBW();
				});

				// init and show SBW interactive
				function initSBW(){
					// show the help modal
					showHelp();

					// fade out copy
					copyBlock.fadeOut(NNA.BROWSER.isOldIE ? 0 : 500);

					// show steer by wire elements
					settings.fadeIn(NNA.BROWSER.isOldIE ? 0 : 500);
					efforts.fadeIn(NNA.BROWSER.isOldIE ? 0 : 500);
					label.fadeIn(NNA.BROWSER.isOldIE ? 0 : 500);
					imageSwitcherElement.fadeIn(NNA.BROWSER.isOldIE ? 0 : 500);
					steeringEffort.fadeIn(NNA.BROWSER.isOldIE ? 0 : 500);

					// click event for switching setting
					element.on('click.sbw', 'ul.settings li', function(e){
						var id = $(this).data('id');
						switchSetting(id);
					});

					// gyro to update frames on ipad
					if(NNA.BROWSER.supportsGyro){
						$(window).on('deviceorientation.sbw', function(orientationEvent){
							// get device rotation in the desired axis
							var isLeft = orientationEvent.originalEvent.beta < 0;
							var b = Math.abs(orientationEvent.originalEvent.beta);

							// keep in bounds 20 degrees of tilt in either direction
							if(b > event.gyroRange) b = event.gyroRange;

							// magically convert to some pixel value that will work with the pan function
							var width = element.width();
							var center = Math.round(width / 2);
							if(isLeft) var mouseX = center - Math.round((b * center) / event.gyroRange);
							else var mouseX = center + Math.round((b * center) / event.gyroRange);

							// pan frames
							pan(mouseX);
						});
					}
					// mouse move event to update frames
					else{
						element.on('mousemove.sbw touchmove.sbw', function(e){
							if(e.type.indexOf('mouse') > -1){
								var mouseX = e.pageX;
							}else if(e.type.indexOf('touch') > -1){
								e.preventDefault();
								var mouseX = e.originalEvent.touches[0].pageX;
							}
							lastMouseX = mouseX;
							pan(mouseX);
						});
					}

					// highlight first setting
					element.find('ul.settings li').eq(0).trigger('click');
				}

				// show help modal
				function showHelp(){
					var modalTemplate = element.find('.modal_sbw_help').clone().show();
					$.publish('/nna/openModal', [modalTemplate]);
				}

				// generates and returns list of frames for the provided id
				function generateFrames(id){
					var data = event[id];
					var frames = [];
					for(var i = 0; i < data.frames; i++){
						var index = (i < 10) ? '0' + i : i;
						frames.push(data.prefix + index + data.suffix);
					}
					return frames;
				}

				// switch the current setting
				function switchSetting(id){
					var settingElement = element.find('ul.settings li[data-id="' + id + '"]');
					var data = event[id];
					var index = settingElement.index();

					// setting selected state
					settingElement.addClass('selected');
					settingElement.siblings('.selected').removeClass('selected');

					// update label
					label.html(data.label);

					// efforts highlighting
					efforts.attr('class', 'efforts').addClass(data.efforts);

					// update image switcher
					updateFrames(id);

					// tagging
					$.publish('/nna/videofeature/steerByWireSettingChange', [index]);
				}

				// load a new set of frames
				function updateFrames(id){
					// generate list of frames
					var frames = generateFrames(id);
					var data = event[id];
					
					// show loader
					//$.publish('/nna/effects/showLoading');
					loadingElement.show();

					// preload images
					NNA.Utils.preloadImages(frames).done(function(imagesPreloaded){
						// apply fix for flickering in firefox
						self.firefoxFlickerFix(imagesPreloaded);

						// first run
						if(imageSwitcher === undefined){
							imageSwitcherElement.imageswitcher({
								imageList: frames,
								useBuiltInLoader: false,
								width: 960,
								height: 540,
								startFrame : data.centerIndex,
								redrawOnResize: true,
								parentElement: element
							});
							imageSwitcher = imageSwitcherElement.data('ImageSwitcher');
						}
						// every other time
						else{
							imageSwitcher.updateImageViewer(frames);
							pan();
						}

						// hide loader
						//$.publish('/nna/effects/hideLoading');
						loadingElement.hide();
					});
				}

				// pan through frames
				function pan(mouseX){
					if(mouseX === undefined) mouseX = lastMouseX;
					var screenPercentage = event.screenPercentage; // percentage of screen where mouse is active
					var width = $(window).width();
					var adjustedWidth = width * screenPercentage;
					var widthDifference = (width - adjustedWidth) / 2;
					var adjustedMouseX = mouseX - widthDifference;

					// bounding
					if(adjustedMouseX < 0) adjustedMouseX = 0;
					if(adjustedMouseX > adjustedWidth) adjustedMouseX = adjustedWidth;

					// only run if image switcher is ready
					if(imageSwitcher !== undefined){
						// calculate index to seek to
						var index = Math.round((adjustedMouseX * (imageSwitcher.numImages - 1)) / adjustedWidth);

						// seek to index
						imageSwitcher.currentFrame = index;
						imageSwitcher.updateFrame();
					}
				}
			};

			// takeover's destroy function
			var destroy = function(event){
				var element = $(event.selector);

				// remove any events we had attached
				element.off('.sbw');
				$(window).off('.sbw');

				// fade away
				$(element).fadeOut(NNA.BROWSER.isOldIE ? 0 : 200, function(){
					$(this).removeClass('show').hide();
				});
			};

			// set the current takeover
			this.setTakeover(event, setup, destroy);

			// publish event
			$.publish('/nna/videofeature/events/steerByWire', [event]);
		},

		// EOC event for CRM
		eventEndOfChapter: function(event){
			$.publish('/nna/videofeature/events/endChapter', [event]);
		},

		// safety shield hotspots
		eventSafetyShield: function(event){
			var self = this;
			// takeover's setup function
			var setup = function(event){
				var element              = $(event.selector);
				var parent               = $(window);
				var hotspots             = $(".shield-hotspots").eq(0);
				var imageswitcherElement = element.find('.ss-image-bg').eq(0); // because of its handy resize events
				var imageswitcher        = imageswitcherElement.data('ImageSwitcher');
				var loadingElement       = element.find('.loading').eq(0);
				var hotspot_overlay      = element.find('.hotspot_overlay').eq(0);
				var hotspot_overlay_img  = hotspot_overlay.find('img').eq(0);
				var ipad                 = navigator.userAgent.toLowerCase().indexOf('ipad') > -1;	
				var overlayCloseBtn      = element.find('.close'); // 2 close btns: disclaimers and overlays

				if(ipad){
					overlayCloseBtn.show();
				}

				var imageList = [event.shieldPreload + "technology/safety_shield/bg.jpg"];

				element.show().addClass('show');
				loadingElement.show();

				// pause video
				this.videoPlayer.pause();
				// threesixty shoudl be hidden while loading is shown
				imageswitcherElement.hide();
				// switches frames
				function switchFrame(frm){	
					if(imageswitcher){
						imageswitcher.currentFrame = frm;
						imageswitcher.updateFrame();
					}
				}

				// preload bg image
				NNA.Utils.preloadImages(imageList).done(function(){
					
					// BEGIN Firefox Flicker Fix
					// Essentially we need to add the preloaded image objects to the DOM (keep them hidden)
					var tmpimg;
					var loadedImageList = [event.shieldPreload + "technology/safety_shield/bg.jpg", event.shieldPreload + "technology/safety_shield/bg_no_risk.jpg", event.shieldPreload + "technology/safety_shield/bg_risk.jpg", event.shieldPreload + "technology/safety_shield/bg_may_occur.jpg", event.shieldPreload + "technology/safety_shield/bg_unavoidable.jpg", event.shieldPreload + "technology/safety_shield/bg_collision.jpg", event.shieldPreload + "technology/safety_shield/collision.jpg", event.shieldPreload + "technology/safety_shield/divider.png", event.shieldPreload + "technology/safety_shield/hotspot.png", event.shieldPreload + "technology/safety_shield/may-occur.jpg", event.shieldPreload + "technology/safety_shield/no-risk.jpg", event.shieldPreload + "technology/safety_shield/risk.jpg", event.shieldPreload + "technology/safety_shield/state-sprite.png", event.shieldPreload + "technology/safety_shield/unavoidable.jpg"];
					var tmpImagContainer = $("<div />").css("display","none").addClass("threesixtyImgHolder");
					$("body").append(tmpImagContainer); // add this to the end of the body - remove when we are done
					
					$.each(loadedImageList, function(idx) {
						tmpimg = $("<img />").css({"visibility":"hidden", "display":"none"}).addClass("threesixtyDomImg");
						tmpImagContainer.append(tmpimg.attr("src", loadedImageList[idx]));
					});
					// END Firefox Flicker Fix

					// init in the middle of flash
					setTimeout(function(){
						// make sure 360 and hint are shown
						
						if(imageswitcher === undefined){
							// init the 360
							imageswitcherElement.imageswitcher({
								imageList: loadedImageList,
								useBuiltInLoader: false,
								width: event.width,
								height: event.height,
								startFrame : 0,
								matchImageElm : hotspots,
								redrawOnResize: true,
								parentElement: element,
								onLoadComplete: function(){
									hotspots.show();
									imageswitcher = imageswitcherElement.data('ImageSwitcher');
									imageswitcherElement.animate({opacity: 1}, NNA.BROWSER.isOldIE ? 0 : 500);
								},
								onRotate: function(){
									
								},
								onRotateEnd : function(frame, isAutoPlay) {
									
								}
							});
							imageswitcherElement.animate({opacity: 0}, 0).show();
							element.find('.hotspot').on("mouseover",function(){
								switchFrame($(this).index()+1);
							}).on("mouseout", function(){
								switchFrame(0);
							});
						}else{
							imageswitcher.currentFrame = event.startFrame;
							imageswitcher.updateFrame();
						}

						// hide the loading indicator
						loadingElement.hide();
					}, 150);
				}).fail(function(){
					// pretend nothing happened and carry on
					element.removeClass('show').hide();
					self.videoPlayer.play();
				});
				
				//Hotspot modal delegate
				this.bodyElement.on('click', '.hotspot', function(e){
					e.preventDefault();
					self.showHotSpotModal(this);
				});
			};

			// takeover's destroy function
			var destroy = function(event){
				$.publish('/nna/effects/flash', [300]);
				$(event.selector).removeClass('show').hide();
			};

			// set the current takeover
			this.setTakeover(event, setup, destroy);

			// publish event
			$.publish('/nna/videofeature/events/safetyShield', [event]);
		},
		
		// shows the handraiser modal
		showHotSpotModal: function(hotspot){
			var self = this;
			var modalPath = $(hotspot).attr('data-modal');
			
			// show modals loading indicator while fetching html
			$.publish('/nna/modalShowLoading');
			
			$.publish('/nna/videofeature/safetyShield', [$(hotspot).attr('data-ms')]);

			// ajax request to get html for modal window and show
			$.ajax({
				url: NNA.PATHS.CONTEXT + modalPath
			}).done(function(html){
				var modalTemplate = $(html);

				// show modal
				$.publish('/nna/openModal', [modalTemplate]);
			});
		},

		// fixes image flicker when using 360 plugin
		firefoxFlickerFix: function(imagesPreloaded){
			if(!$.browser.mozilla) return;
			var tmpimg;
			var loadedImageList = [];
			var tmpImagContainer = $("<div />").css("display","none").addClass("threesixtyImgHolder");
			$.each(imagesPreloaded, function(idx) {
				tmpimg = imagesPreloaded[idx];
				$(tmpimg).css({
					"visibility":"hidden",
					"display":"none"
				}).addClass("threesixtyDomImg");
				loadedImageList.push(imagesPreloaded[idx].src); // The source will be the full URL
				tmpImagContainer.append(imagesPreloaded[idx]);
			});
			$('.threesixtyImgHolder').remove(); // remove any previous fixes
			$("body").append(tmpImagContainer); // add this to the end of the body - remove when we are done
		},

		setTakeover: function(event, setup, destroy){
			if(this.currentTakeover !== null) this.unsetTakeover();
			this.currentTakeover = arguments;
			this.videoPlayer.pause();
			this.currentTakeover[1].apply(this, [this.currentTakeover[0]]);
			$.publish('/nna/videofeature/setTakeover');
		},

		unsetTakeover: function(){
			if(this.currentTakeover === null) return;
			this.currentTakeover[2].apply(this, [this.currentTakeover[0]]);
			this.currentTakeover = null;
			$.publish('/nna/videofeature/unsetTakeover');
		},

		// return a list of chapters pulled from timeline
		getChapters: function(){
			var chapters = [];
			for(var i = 0; i < this.videoData.timeline.length; i++){
				var timelineEvent = this.videoData.timeline[i];
				if(timelineEvent.type === 'CHAPTER' || timelineEvent.type === 'MARKER') chapters.push(timelineEvent);
			}
			return chapters;
		},

		// return a list of chapters that have been buffered or loaded
		getLoadedChapters: function(){

		},

		// seek to CHAPTER or MARKER by using the it's id
		seekChapter: function(id){
			var self = this;

			// find the requested chapter
			var chapters = this.chaptersWithMarkers;
			for(var i = 0; i < chapters.length; i++){
				// if chapter found
				var chapter = chapters[i];
				if(chapter.id === id){
					// pause video and flash screen
					this.videoPlayer.pause();

					// [NNA-1420] - Show loading screen when seeking new chapter - IE8 only
					if($.browser.msie && parseInt($.browser.version) < 9){ 
						$.publish('/nna/effects/showLoading');
					}

					// hide any content that may currently be shown
					this.contentElements.filter('.show, :animated').stop(true, true).removeClass('show').hide();

					// clear any timeouts that may have been set
					this.clearTimeouts();

					// close any open takeovers
					this.unsetTakeover();

					// make sure end is not set
					this.hasEnded = false;
					
					// seek video and resume playback
					this.videoPlayer.currentTime(chapter.timecode / 1000);

					// ie8 needs fix here because it will not resume without a delay
					if($.browser.msie && parseInt($.browser.version) < 9) {
						// [NNA-1420] - listen for loaded data so that we can hide the loading screen we turned on above for IE
						self.videoPlayer.addEvent("loadeddata", function(){
							$.publish('/nna/effects/hideLoading');
							self.videoPlayer.removeEvent('loadeddata', arguments.callee);
						});
						setTimeout(function(){ self.videoPlayer.play(); }, 250);
					}else{
						this.videoPlayer.play();	
					} 

					// this makes sure our events will fire properly starting from the event for the current chapter
					this.fromIndex = $.inArray(chapter, this.videoData.timeline);

					// pretend an event was so things can respond to the seek
					if(chapter.type === 'CHAPTER'){
						//this.eventChapter(chapter);
					}else if(chapter.type === 'MARKER'){
						// we are jumping in to a chapter so that has to be handled also
						for(var j = i - 1; j > 0; j--){
							if(chapters[j].type === 'CHAPTER'){
								//this.eventChapter(chapters[j]);
								break;
							}
						}
						this.eventMarker(chapter);
					}

					// found the chapter exit loop
					break;
				}
			}
		},

		// skip to next chapter
		nextChapter: function(){
			// only works if there is a current chapter
			if(this.currentChapter === null) return;

			// if video is ended skip no next journey
			if(this.hasEnded === true){
				if(this.options.nextPage !== null) window.location = this.options.nextPage;
				return;
			}

			// if video is paused just resume play instead of seek
			if(this.videoPlayer.paused()){
				this.videoPlayer.play();
				return;
			}

			// look up next chapter
			var chapters = this.chapters;
			for(var i = 0; i < chapters.length; i++){
				var chapter = chapters[i];
				if(chapter.id === this.currentChapter.id){
					// seek to next chapter if one exists
					var nextChapter = chapters[i + 1];
					if(nextChapter) $.publish('/nna/videofeature/seekChapter', [nextChapter.id]);
					break;
				}
			}
		},

		// skip to previous chapter
		previousChapter: function(){
			// only works if there is a current chapter
			if(this.currentChapter === null) return;

			// look up previous chapter
			var chapters = this.chapters;
			for(var i = 0; i < chapters.length; i++){
				var chapter = chapters[i];
				if(chapter.id === this.currentChapter.id){
					// seek to previous chapter if one exists
					var previousChapter = chapters[i - 1];
					if(previousChapter) $.publish('/nna/videofeature/seekChapter', [previousChapter.id]);
					break;
				}
			}
		},

		// restart current chapter
		restartChapter: function(){
			// only works if there is a current chapter
			if(this.currentChapter === null) return false;

			// seek to current chapter
			$.publish('/nna/videofeature/seekChapter', [this.currentChapter.id]);
		}
	});

})(NNA, jQuery);