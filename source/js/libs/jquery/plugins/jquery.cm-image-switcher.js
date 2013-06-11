/**
 * @author Scott Luedtke
 * @date 14.12.12
 */
(function($) {
	
/**         							PLUGIN
 * _____________________________________________ 
 */
	$.fn.imageswitcher = function(options){
		var settings = {
				imageList        : null, //array of images to use
				width            : 1280,
				height           : 660,
				redrawOnResize   : true, // determines if resize events should trigger when window resize event occurs 
				useBuiltInLoader : true,
				onLoadComplete   : null,
				onRotate         : null, //fires when user drags the 360
				onRotateEnd      : null, //fires after rotate is done
				onAutoPlayEnd    : null, 
				onResize         : null, //called after image has been resized and positioned
				matchImageElm	 : null,
				loadSpinnerHTML  : '<div id="imageswitcher-loading"></div>',
				startFrame 		 : 0,
				parentElement    : $(window)
		}
		
		return this.each(function(){
			var $element = $(this);
			var imageSwitcherViewer;
			if(options) $.extend(true, settings, options);
			imageSwitcherViewer = new ImageSwitcherViewer($element, settings);
		});
	};

/**         							THREE SIXTY VIEWER
 * _____________________________________________ 
 */	
	ImageSwitcherViewer = function(element, settings){
		this.$element = element;
		
		//start with the first frame
		this.$imageswitcherImage = $('<img src="'+settings.imageList[settings.startFrame]+'" id="imageswitcher-image" />').appendTo(this.$element);
		this.$loadSpinner     = null;
		this.$imageTransition = null;
		
		//allows you to make public calls
		this.$element.data('ImageSwitcher', this);
		
		
		this.settings      = settings;
		this.imageList     = this.settings.imageList;
		this.numImages     = this.imageList.length;
		this.currentFrame  = this.settings.startFrame;
		this.prevFrame     = this.currentFrame;
		this.isTouchDevice = 'ontouchstart' in window; // (/iPhone|iPod|iPad|Android/i).test(navigator.userAgent);
		this.enabled       = false;	
		
		this.zeroOpacityCSS = {
			'opacity' : '0',
			'filter' : 'alpha(opacity=0)'
		};
		
		this.loadImages();
		
		var self = this;
		
		if(this.settings.redrawOnResize){
			$(window).resize(function(e){
				self.onWindowResize();
			});
			self.onWindowResize();
		}
	}
	
	/**         	"PUBLIC"
	 * _____________ 
	 * 
	 * Safe to call these methods directly
	 *
	 */
	/**
	 * Gets called outside of this plugin.
     *
     * imageList : new array of images 
	 */
	ImageSwitcherViewer.prototype.updateImageViewer = function(imageList){
		this.disable();
		
		this.imageList = imageList;
		this.numImages = this.imageList.length;
		
		this.doTransition = false;
		
		this.loadImages();
	}
	
	ImageSwitcherViewer.prototype.enable = function(){
		//enable only if it is disabled
		if(!this.enabled){
			this.enabled = true;
		}
	}
	
	ImageSwitcherViewer.prototype.disable = function(){
		this.enabled = false;
	}

	/**         	DISPLAY
	 * _____________ 
	 */
	ImageSwitcherViewer.prototype.updateFrame = function(isAutoPlay){
		if(this.prevFrame != this.currentFrame){
			this.$imageswitcherImage.attr("src", this.imageList[this.currentFrame]);
			
			this.prevFrame = this.currentFrame;
			
			if(this.settings.onRotate != null) this.settings.onRotate(this.currentFrame, isAutoPlay);
		}
	}
	
	ImageSwitcherViewer.prototype.displayFirstFrame = function(){
		var self = this;
		
		//fade in the first frame of the next on top keeping the same frame
		if(this.doTransition){
			this.$imageTransition = $('<img src=""" id="image-transition" />').appendTo(this.$element);
			this.$imageTransition
			.css(this.zeroOpacityCSS)
			.attr('src', this.imageList[this.currentFrame])
			.animate({opacity:1}, 500, function(){
				//add frame to view
				self.$imageswitcherImage.attr("src", self.imageList[self.currentFrame]);
				
				if(this.settings.redrawOnResize) self.onWindowResize();
				
				//remove the transition and enable again
				setTimeout(function(){
					
					self.$imageTransition.remove();
					self.enable();
					
					if(self.settings.onLoadComplete != null) self.settings.onLoadComplete();
				}, 500);
			});
		}else{
			this.$imageswitcherImage.attr('src', this.imageList[this.currentFrame]);
			this.enable();
			
			if(this.settings.redrawOnResize) self.onWindowResize();
			
			if(this.settings.onLoadComplete != null) this.settings.onLoadComplete();
		}
		
		this.prevFrame = this.currentFrame;
	}
	
	/**         	PRELOADING
	 * _____________ 
	 */
	ImageSwitcherViewer.prototype.loadImages = function() {
		if(this.settings.useBuiltInLoader){
			if(this.$loadSpinner == null) this.$loadSpinner = $(this.settings.loadSpinnerHTML).appendTo(this.$element);
			else this.$loadSpinner.stop(true, false).fadeIn(500);
		}
		
		var self = this;
		var numLoaded = 0;
		
		for(var i=0; i<this.numImages; i++){
			var image = $(new Image());
			
			image.load(function(e){
				numLoaded++;
				if(numLoaded == self.numImages) self.onLoadComplete();
			});
			
			image.attr("src", self.imageList[i]);
		}
	}
	
	ImageSwitcherViewer.prototype.onLoadComplete = function() {
		if(this.settings.useBuiltInLoader){
			this.$loadSpinner.stop(true, false).fadeOut(500);
		}
		
		this.displayFirstFrame();
	}
	
	/**         							RESIZING
	 * _____________________________________________ 
	 */
	ImageSwitcherViewer.prototype.onWindowResize = function() {
		// collect various dimensions
		var $parentElement = this.settings.parentElement;
		var imgwidth       = this.$imageswitcherImage.width();
		var imgheight      = this.$imageswitcherImage.height();
		var winwidth       = $parentElement.width() ;
		var winheight      = $parentElement.height();
		var widthratio     = winwidth / this.settings.width;
		var heightratio    = winheight / this.settings.height;
		var widthdiff      = heightratio * this.settings.width;
		var heightdiff     = widthratio * this.settings.height;
		
		// scale image
		if(heightdiff > winheight){
			this.$imageswitcherImage.css({
				width: winwidth + 'px',
				height: heightdiff + 'px'
			});
		}else{
			this.$imageswitcherImage.css({
				width: widthdiff + 'px',
				height: winheight + 'px'
			});
		}
		
		// center image
		var centerY = (winheight / 2) - (this.$imageswitcherImage.height() / 2);
		var centerX = (winwidth / 2)  - (this.$imageswitcherImage.width() / 2);
		this.$imageswitcherImage.css({
			position: 'absolute',
			left: centerX + 'px',
			top: centerY + 'px'
		});
		
		if(this.settings.matchImageElm){
			this.settings.matchImageElm.css({
				width: this.$imageswitcherImage.css("width"),
				height: this.$imageswitcherImage.css("height"),
				position: 'absolute',
				left: centerX + 'px',
				top: centerY + 'px'
			});	
		}

		// resize handler
		if(this.settings.onResize != null){
			//calculate the percentage the dimensions have changed compared to the original dimensions
			var originalWidthDifference  = this.$imageswitcherImage.width() / this.settings.width;
			var originalHeightDifference = this.$imageswitcherImage.height() / this.settings.height;
			
			// call resize handler
			this.settings.onResize(originalWidthDifference, originalHeightDifference, this.$imageswitcherImage.position().left, this.$imageswitcherImage.position().top);
		}
	}

	/**      DESTROY
	 * _____________ 
	 */
	 ImageSwitcherViewer.prototype.destroy = function(){
	 	
	 	// remove added dom elements
	 	this.$element.empty();
	 }

	/**         	UTILS
	 * _____________ 
	 */
	ImageSwitcherViewer.prototype.getEventPosX = function(e){
		if(e.type.indexOf('mouse') > -1){
			return e.pageX;
		}else if(e.type.indexOf('touch') > -1){
			return e.originalEvent.touches[0].pageX;
		}
	}
	
	ImageSwitcherViewer.prototype.getEventPosY = function(e){
		if(e.type.indexOf('mouse') > -1){
			return e.pageY;
		}else if(e.type.indexOf('touch') > -1){
			return e.originalEvent.touches[0].pageY;
		}
	}
	
	ImageSwitcherViewer.prototype.stop = function(){
		clearInterval(this.autoPlayTimer)
	}
	
})(jQuery);