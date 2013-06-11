(function(NNA, $){

	NNA.Effects = Class.extend({
		init: function(options){
			// configurable options
			this.options = {
				flashDuration: 500,  // duration of flash animation
				loadingDuration: 250, // show and hide duration of loading screen
				loadTimeout: 100000    // time before loading screen is timed out and hidden
			};
			$.extend(true, this.options, options);

			// class attributes
			this.container = $('#effects');
			this.loadingElement = this.container.find('.loading').eq(0);
			this.flashElement = this.container.find('.flash').eq(0);
			this.loadCount = 0;

			// no loading animation for ie8 and previous
			if(NNA.BROWSER.isOldIE) this.options.loadingDuration = 0;

			// init
			this.initSubscriptions();

			debug.log('NNA.Effects: initialized');
		},

		initSubscriptions: function(){
			$.subscribe('/nna/effects/flash', $.proxy(function(e, duration){ this.flash(duration); }, this));
			$.subscribe('/nna/effects/showLoading', $.proxy(this.showLoading, this));
			$.subscribe('/nna/effects/hideLoading', $.proxy(this.hideLoading, this));
		},

		// flash effect
		flash: function(duration){
			if(duration === undefined) duration = this.options.flashDuration;
			var easing = 'easeInCirc';
			var quarterTime = duration / 4;
			this.flashElement.stop(true, false).queue(function(){
				$(this).css({ display: 'block', opacity: 0 }).dequeue();
			}).animate({
				opacity: 1
			}, quarterTime, easing).delay(quarterTime * 2).animate({
				opacity: 0
			}, quarterTime,  easing).queue(function(){
				$(this).css({ display: 'none', opacity: 0 }).dequeue();
			});
		},

		// show the loading indicator
		showLoading: function(){
			if(this.loadCount === 0){
				// animate visible
				this.loadingElement.stop(true, false).queue(function(){
					$(this).css({ display: 'block' }).dequeue();
				}).animate({
					opacity: 1
				}, this.options.loadingDuration);

				// increment load count
				this.loadCount += 1;
			}else{
				// increment load count
				this.loadCount += 1;
			}

			// timeout the loader just in case show and hide is not called an equal number of times
			clearTimeout(this.loadTimeout);
			this.loadTimeout = setTimeout($.proxy(function(){
				if(this.loadCount >= 1){
					this.loadCount = 1;
					this.hideLoading();
				}
			}, this), this.options.loadTimeout);
		},

		// hide the loading indicator
		hideLoading: function(){
			if(this.loadCount === 1){
				// animate hidden
				this.loadingElement.stop(true, false).animate({
					opacity: 0
				}, this.options.loadingDuration).queue(function(){
					$(this).css({ display: 'none' }).dequeue();
				});

				// decrement load count
				this.loadCount -= 1;
			}else{
				// decrement load count
				this.loadCount -= 1;
			}

			// clear interval when hide has been called as many times as show
			if(this.loadCount === 0) clearTimeout(this.loadTimeout);
		}
	});
	
})(NNA, jQuery);