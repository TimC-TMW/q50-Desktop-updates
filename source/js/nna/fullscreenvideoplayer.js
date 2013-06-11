(function(NNA, $){
	
	// abstract away the specific video player we are using from the rest of the code
	// if we have to ever change video players we can make implement them in here and hopefully not have to change the rest of the code
	NNA.FullScreenVideoPlayer = Class.extend({
		init: function(video, container, options){
			// configurable options
			this.options = {
				onReady: $.noop()
			};
			$.extend(true, this.options, options);

			// class attributes
			this.container = $(container);
			this.startVideo = video;
			this.videoElement = null;
			this.videojs = null;
			this.isReady = false;

			// init
			this.append();
			this.initVideo();
			this.attach();
			this.initSubscriptions();

			debug.log('NNA.VideoPlayer: initialized');
		},

		// append required elements to container element
		append: function(){
			// create video element
			this.videoElement = '<video id="feature_player" class="video-js vjs-default-skin" preload="none" width="1280" height="720" data-setup=\'{}\'>';
			for(var format in this.startVideo){
				this.videoElement += '<source src="' + this.startVideo[format] + '" type="video/' + format + '" />';
			}
			this.videoElement += '</video>';
			this.videoElement = $(this.videoElement);

			// create poster element
			this.posterElement = $('<img src="" alt="" />');

			// append to container
			this.container.append(this.videoElement);
			this.container.append(this.posterElement);
		},

		// initalize subscriptions video player will respond to
		initSubscriptions: function(){
			var self = this;

			$.subscribe('/nna/audioToggled', function(e, state){
				if(state) self.videojs.volume(1);
				else self.videojs.volume(0);
			});
		},

		// init the video player
		initVideo: function(){
			var self = this;

			// init videojs
			_V_(this.videoElement.get(0), {
				techOrder: $.browser.msie ? ['flash', 'html5'] : ['html5', 'flash'],
				flash: { swf: NNA.PATHS.JSDIR + "libs/videojs/video-js.swf" },
				controls: false,
				preload: 'metadata',
				loop: false
			}, function(){
				self.videoReady(this);
			});
		},

		// called once the video player is ready
		videoReady: function(videojs){
			// flag indicating the video player is ready to be interacted with
			this.isReady = true;

			// store a reference so api calls can be made later
			this.videojs = videojs;

			// videojs wraps the original video element grab this new div wrapper
			this.videoElement = $(this.videojs.el);

			// resize handler and first resize of video
			$(window).on('resize', $.proxy(this.resize, this));
			this.resize();

			// ready callback
			if(typeof this.options.onReady === 'function') this.options.onReady(this);
		},

		// atach event handlers
		attach: function(){
			var self = this;

			// enable playback on ipad by clicking anywhere on the screen
			if(Modernizr.touch){
				$(document.body).on('touchstart.touch-play', function(e){
					$(this).off('.touch-play');
					self.videojs.play();
				});
			}
		},

		// set the poster image
		setPoster: function(src){
			this.posterElement.attr('src', src);
		},

		// show the poster element
		showPoster: function(){
			this.posterElement.show();
		},

		// hide the poster element
		hidePoster: function(){
			this.posterElement.hide();
		},

		// play video
		play: function(){
			if(!this.isReady) throw 'PlayerNotReady';
			return this.videojs.play.apply(this.videojs, arguments);
		},

		// pause video
		pause: function(){
			if(!this.isReady) throw 'PlayerNotReady';
			return this.videojs.pause.apply(this.videojs, arguments);
		},

		// set or get the current volume uses a decimal between 0 and 1
		volume: function(){
			return this.videojs.volume.apply(this.videojs, arguments);
		},

		// load video
		src: function(src){
			if(!this.isReady) throw 'PlayerNotReady';

			// transform in to a object videojs understands
			var transformed = [];
			for(var type in src){
				transformed.push({
					type: 'video/' + type,
					src: src[type]
				});
			}

			// set src in videojs
			return this.videojs.src.apply(this.videojs, transformed);
		},

		// get total video duration in seconds
		duration: function(){
			if(!this.isReady) throw 'PlayerNotReady';
			return this.videojs.duration.apply(this.videojs, arguments);
		},

		// return with sections of the video that have been downloaded
		buffered: function(){
			if(!this.isReady) throw 'PlayerNotReady';
			return this.videojs.buffered.apply(this.videojs, arguments);
		},

		// get percentage of video that is buffered
		bufferedPercent: function(){
			if(!this.isReady) throw 'PlayerNotReady';
			return this.videojs.bufferedPercent.apply(this.videojs, arguments) * 100;
		},

		// get or set the current position in the video in seconds
		currentTime: function(){
			if(!this.isReady) throw 'PlayerNotReady';
			return this.videojs.currentTime.apply(this.videojs, arguments);
		},

		// add event to player
		addEvent: function(){
			return this.videojs.addEvent.apply(this.videojs, arguments);
		},

		// remove event from player
		removeEvent: function(){
			return this.videojs.removeEvent.apply(this.videojs, arguments);
		},

		// check if video player is paused
		paused: function(){
			return this.videojs.paused.apply(this.videojs, arguments);
		},

		// resize video and external poster elements
		resize: function(){
			// dimensions
			var containerWidth = this.container.width();
			var containerHeight = this.container.height();
			var videoWidth = 1280;
			var videoHeight = 720;
			var containerRatio = containerHeight / containerWidth;
			var videoRatio = videoHeight / videoWidth;
			var width, height, top, left;

			// determine if cropping will be veritcal or horizontal
			if(videoRatio > containerRatio){
				// new dimensions
				width = containerWidth;
				height = (containerWidth * videoRatio);
				left = 0;
				top = (height - containerHeight) / -2;

				// size and position video
				this.videojs.size(width, height);
				this.videoElement.css({
					left: left + 'px',
					top:  top + 'px'
				});

				// size and position poster image
				this.posterElement.css({
					width: width + 'px',
					height: height + 'px',
					left: left + 'px',
					top: top + 'px'
				});
			}else{
				// new dimensions
				width = (containerHeight / videoRatio);
				height = containerHeight;
				left = (width - containerWidth) / -2;
				top = 0;

				// size and position video
				this.videojs.size(width, height);
				this.videoElement.css({
					left: left + 'px',
					top: top + 'px'
				});

				// size and position poster image
				this.posterElement.css({
					width: width + 'px',
					height: height + 'px',
					left: left + 'px',
					top: top + 'px'
				});
			}
		}
	});
	
})(NNA, jQuery);