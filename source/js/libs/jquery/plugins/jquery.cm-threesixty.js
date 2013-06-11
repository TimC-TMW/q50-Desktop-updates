/**
 * @author Arjay Aquino
 * @date 24.11.11
 * @desc Three Sixty
 * @usage $("div").threesixty(options)
 *        Make public calls to it by : $("div").data("ThreeSixty").publicMethod(args)
 */
(function($) {
	
/**         							PLUGIN
 * _____________________________________________ 
 */
	$.fn.threesixty = function(options){
		var settings = {
				imageList        : null, //array of images to use
				width            : 1280,
				height           : 660,
				frameSteps       : 50,   //smaller number equals faster rotation
				framesPerSec     : 24,
				reverse          : false,
				redrawOnResize   : true, // determines if resize events should trigger when window resize event occurs 
				useBuiltInLoader : true,
				onLoadComplete   : null,
				onRotate         : null, //fires when user drags the 360
				onRotateEnd      : null, //fires after rotate is done
				onAutoPlayEnd    : null, 
				onResize         : null, //called after image has been resized and positioned
				loadSpinnerHTML  : '<div id="threesixty-loading"></div>',
				startFrame 		 : 5,
				parentElement    : $(window)
		}
		
		return this.each(function(){
			var $element = $(this);
			var threeSixtyViewer;
			if(options) $.extend(true, settings, options);
			threeSixtyViewer = new ThreeSixtyViewer($element, settings);
		});
	};

/**         							THREE SIXTY VIEWER
 * _____________________________________________ 
 */	
	ThreeSixtyViewer = function(element, settings){
		this.$element = element;
		
		//start with the first frame
		this.$threesixtyImage = $('<img src="'+settings.imageList[settings.startFrame]+'" id="threesixty-image" />').appendTo(this.$element);
		this.$loadSpinner     = null;
		this.$imageTransition = null;
		
		//allows you to make public calls
		this.$element.data('ThreeSixty', this);
		
		this.autoPlayTimer;
		
		this.settings      = settings;
		this.imageList     = this.settings.imageList;
		this.numImages     = this.imageList.length;
		this.currentFrame  = this.settings.startFrame;
		this.prevFrame     = this.currentFrame;
		this.dragPosition  = settings.startFrame;
		this.intervalTime  = 1000 / this.settings.framesPerSec;
		this.isTouchDevice = 'ontouchstart' in window; // (/iPhone|iPod|iPad|Android/i).test(navigator.userAgent);
		this.doTransition  = false; //if updating 360 this will be true
		this.isAutoPlaying = false;
		this.enabled       = false;
		this.autoPlayFrame = this.settings.startFrame;
		
		this.autoPlayDirection; //left, right
				
		this.nonSelectableCSS = {
			'-moz-user-select' : 'none',
			'-khtml-user-select' : 'none',
			'user-select' : 'none'
		};
		
		this.zeroOpacityCSS = {
			'opacity' : '0',
			'filter' : 'alpha(opacity=0)'
		};
		
		this.$element.css(this.nonSelectableCSS);
		
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
	ThreeSixtyViewer.prototype.updateThreeSixty = function(imageList){
		this.disable();
		
		this.imageList = imageList;
		this.numImages = this.imageList.length;
		
		this.$element.css('cursor', 'auto').unbind('mousedown touchstart');
		
		this.doTransition = false;
		
		this.loadImages();
	}
	
	ThreeSixtyViewer.prototype.autoPlay = function(frame, direction){
		if(this.isAutoPlaying) return;
		
		var self = this;
			
		this.autoPlayFrame     = frame;
		this.autoPlayDirection = direction;
		
		/*
		 * autoplay if we're not already on that frame
		 */
		if(this.prevFrame != this.autoPlayFrame){
			this.$element.css('cursor', 'auto').unbind('mousedown touchstart');
			this.isAutoPlaying = true;
			this.autoPlayTimer = setInterval(function(){ self.onAutoPlayTimer() }, this.intervalTime);
			this.disable();
		}else{
			this.settings.onAutoPlayEnd(this.currentFrame);	
		}
	}
	
	ThreeSixtyViewer.prototype.enable = function(){
		//enable only if it is disabled
		if(!this.enabled){
			this.enabled = true;
			this.initMouseEvents();
		}
	}
	
	ThreeSixtyViewer.prototype.disable = function(){
		this.enabled = false;
		this.$element.css('cursor', 'auto').unbind('mousedown touchstart');
	}
	
	/**         	EVENTS
	 * _____________ 
	 */
	ThreeSixtyViewer.prototype.initMouseEvents = function(){
		var self = this; 
		
		this.$element.css('cursor', 'move');
		
		this.$element.bind('mousedown.threesixty touchstart.threesixty', function(e){
			e.preventDefault();
			
			var prevMouseX = (self.settings.reverse) ? self.getEventPosX(e) * -1 : self.getEventPosX(e);
			// var startMouseY = (self.settings.reverse) ? self.getEventPosY(e) * -1 : self.getEventPosY(e);
			// var mouseYMaxDrift = 20;
			
			self.$element.bind('mousemove.threesixty touchmove.threesixty', function(e){
				e.preventDefault();
				
				var mouseX    = (self.settings.reverse) ? self.getEventPosX(e) * -1 : self.getEventPosX(e);
				var frameStep = Math.round((mouseX - prevMouseX) / self.settings.frameSteps);
				
				if(Math.abs(frameStep) > 0 && mouseX != prevMouseX){
					var frame = self.currentFrame + frameStep;
					
					//loop to the end and work down
					if(frame < 0){
						self.currentFrame = self.numImages - Math.abs(frame % self.numImages);
					}
					
					//loop at the start and work up
					else if(frame >= self.numImages){
						self.currentFrame = frame % self.numImages;
					}else{
						self.currentFrame = frame;
					}
					
					prevMouseX = mouseX;
					
					self.updateFrame(false);
				}
			});
			
			self.$element.bind('mouseup.threesixty touchend.threesixty', function(e){
				self.$element.unbind('mousemove.threesixty touchmove.threesixty');
				self.$element.unbind('mouseup.threesixty touchend.threesixty');
				$('html, body').unbind('mouseup.threesixty touchend.threesixty');
				
				if(self.settings.onRotateEnd != null) self.settings.onRotateEnd(self.currentFrame);
				
				return false;
			});
			
			$('html, body').bind('mouseup.threesixty touchend.threesixty', function(e){
				self.$element.unbind('mousemove.threesixty touchmove.threesixty');
				self.$element.unbind('mouseup.threesixty touchend.threesixty');
				$('html, body').unbind('mouseup.threesixty touchend.threesixty');
				
				if(self.settings.onRotateEnd != null) self.settings.onRotateEnd(self.currentFrame);
				
				return false;
			});
			
		});
	}
	
	/**
	 * Auto play until you reach the frame
	 */
	ThreeSixtyViewer.prototype.onAutoPlayTimer = function(){
		if(this.autoPlayDirection == 'left') this.currentFrame--;
		else if(this.autoPlayDirection == 'right') this.currentFrame++;
		
		//Decide which is the fastest way to get to the new frame
		else if(this.autoPlayDirection == ''){
			if(this.autoPlayFrame > this.currentFrame) this.currentFrame++;
			else if(this.autoPlayFrame < this.currentFrame){
				//distance is shorter if we go add frames instead of substracting
				if((((this.numImages-1) - this.currentFrame) + this.autoPlayFrame) < (this.currentFrame - this.autoPlayFrame)) this.currentFrame++;
				else this.currentFrame--;
			}
		}
		
		
		if(this.currentFrame < 0) this.currentFrame = this.numImages-1; //set to total frames
		
		if(this.currentFrame > this.numImages-1) this.currentFrame = this.settings.startFrame;
		
		//display that frame
		this.updateFrame(true);
		
		// Stop when frame is reached
		if(this.currentFrame == this.autoPlayFrame){
			clearInterval(this.autoPlayTimer);
			
			this.isAutoPlaying = false;
			this.enable();
			
			if(this.settings.onAutoPlayEnd != null) this.settings.onAutoPlayEnd(this.currentFrame);
		}
	}
	
	/**         	DISPLAY
	 * _____________ 
	 */
	ThreeSixtyViewer.prototype.updateFrame = function(isAutoPlay){
		if(this.prevFrame != this.currentFrame){
			this.$threesixtyImage.attr("src", this.imageList[this.currentFrame]);
			
			this.prevFrame = this.currentFrame;
			
			if(this.settings.onRotate != null) this.settings.onRotate(this.currentFrame, isAutoPlay);
		}
	}
	
	ThreeSixtyViewer.prototype.displayFirstFrame = function(){
		var self = this;
		
		//fade in the first frame of the next threesixty on top keeping the same frame
		if(this.doTransition){
			this.$imageTransition = $('<img src=""" id="threesixty-image-transition" />').appendTo(this.$element);
			this.$imageTransition
			.css(this.zeroOpacityCSS)
			.attr('src', this.imageList[this.currentFrame])
			.animate({opacity:1}, 500, function(){
				//add frame to view
				self.$threesixtyImage.attr("src", self.imageList[self.currentFrame]);
				
				if(this.settings.redrawOnResize) self.onWindowResize();
				
				//remove the transition and enable 360 again
				setTimeout(function(){
					
					self.$imageTransition.remove();
					self.enable();
					
					if(self.settings.onLoadComplete != null) self.settings.onLoadComplete();
				}, 500);
			});
		}else{
			this.$threesixtyImage.attr('src', this.imageList[this.currentFrame]);
			this.enable();
			
			if(this.settings.redrawOnResize) self.onWindowResize();
			
			if(this.settings.onLoadComplete != null) this.settings.onLoadComplete();
		}
		
		this.prevFrame = this.currentFrame;
	}
	
	/**         	PRELOADING
	 * _____________ 
	 */
	ThreeSixtyViewer.prototype.loadImages = function() {
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
	
	ThreeSixtyViewer.prototype.onLoadComplete = function() {
		if(this.settings.useBuiltInLoader){
			this.$loadSpinner.stop(true, false).fadeOut(500);
		}
		
		this.displayFirstFrame();
	}
	
	/**         							RESIZING
	 * _____________________________________________ 
	 */
	ThreeSixtyViewer.prototype.onWindowResize = function() {
		// collect various dimensions
		var $parentElement = this.settings.parentElement;
		var imgwidth       = this.$threesixtyImage.width();
		var imgheight      = this.$threesixtyImage.height();
		var winwidth       = $parentElement.width() ;
		var winheight      = $parentElement.height();
		var widthratio     = winwidth / this.settings.width;
		var heightratio    = winheight / this.settings.height;
		var widthdiff      = heightratio * this.settings.width;
		var heightdiff     = widthratio * this.settings.height;
		
		// scale image
		if(heightdiff > winheight){
			this.$threesixtyImage.css({
				width: winwidth + 'px',
				height: heightdiff + 'px'
			});
		}else{
			this.$threesixtyImage.css({
				width: widthdiff + 'px',
				height: winheight + 'px'
			});
		}
		
		// center image
		var centerY = (winheight / 2) - (this.$threesixtyImage.height() / 2);
		var centerX = (winwidth / 2)  - (this.$threesixtyImage.width() / 2);
		this.$threesixtyImage.css({
			position: 'absolute',
			left: centerX + 'px',
			top: centerY + 'px'
		});
		
		// resize handler
		if(this.settings.onResize != null){
			//calculate the percentage the dimensions have changed compared to the original dimensions
			var originalWidthDifference  = this.$threesixtyImage.width() / this.settings.width;
			var originalHeightDifference = this.$threesixtyImage.height() / this.settings.height;
			
			// call resize handler
			this.settings.onResize(originalWidthDifference, originalHeightDifference, this.$threesixtyImage.position().left, this.$threesixtyImage.position().top);
		}
	}

	/**      DESTROY
	 * _____________ 
	 */
	 ThreeSixtyViewer.prototype.destroy = function(){
	 	// attempt to clean up events
	 	this.$element.unbind('.threesixty');
	 	$('html, body').unbind('.threesixty');
	 	
	 	// remove added dom elements
	 	this.$element.empty();
	 	
	 	// restore cursor
	 	this.$element.css('cursor', 'auto');
	 }

	/**         	UTILS
	 * _____________ 
	 */
	ThreeSixtyViewer.prototype.getEventPosX = function(e){
		if(e.type.indexOf('mouse') > -1){
			return e.pageX;
		}else if(e.type.indexOf('touch') > -1){
			return e.originalEvent.touches[0].pageX;
		}
	}
	
	ThreeSixtyViewer.prototype.getEventPosY = function(e){
		if(e.type.indexOf('mouse') > -1){
			return e.pageY;
		}else if(e.type.indexOf('touch') > -1){
			return e.originalEvent.touches[0].pageY;
		}
	}
	
	ThreeSixtyViewer.prototype.stop = function(){
		clearInterval(this.autoPlayTimer)
	}
	
})(jQuery);