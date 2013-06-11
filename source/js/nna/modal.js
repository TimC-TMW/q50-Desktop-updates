(function(NNA, $) {
	NNA.Modal = Class.extend(/** @lends NNA.Modal.prototype */{
		/**
			The global modal window system. Typically made available on every single page via PageControllers.
			<p>This Class <strong>subscribes</strong> to the following Class-specific topics:</p>
			<ul>
			<li><em>/nna/openModal [modalContents, openCallback, closeCallback]</em></li>
			<li><em>/nna/closeModal [callback]</em></li>
			<li><em>/nna/modalShowLoading</em></li>
			<li><em>/nna/positionModal</em></li>
			</ul>
			<p>This Class <strong>publishes</strong> to the following Class-specific topics:</p>
			<ul>
			<li><em>/nna/modalOpenComplete</em></li>
			<li><em>/nna/modalCloseComplete</em></li>
			</ul>
			@constructs
			@author Evan Lask
			@version 1.0
			@param {Object} [options] Object containing configurable options for the modal window
		*/
		init: function(options) {
			
			this.options = {
				overlayOpacity: 0.6,
				overlayClickClose: true,
				showClose: true,
				contentCloseDelegate: null,
				centerOnResize: true,
				centerOnScroll: false,
				transitionDuration: 250,
				onOpenComplete: function(){},
				onCloseComplete: function(){},
				onOpenStart: function(){},
				onCloseStart: function(){}
			};
			$.extend(true, this.options, options);
			
			this.overlay = null;
			this.modal = null;
			this.loading = null;
			this.modalContent = null;
			this.closeButton = null;
			this.activeCloseCallback = null;
			this.isOpen = false;
			this.isLoading = false;
			this.subscriptionHandlers = {};
			
			this.inject();
			this.attach();
			
			// framework subscriptions
			this.initFrameworkSubscriptions();
		},
		
		inject: function() {
			
			// create and embed required elements
			this.overlay = $('<div id="modal-overlay"></div>').appendTo('body');
			this.loading = $('<div id="modal-loading"></div>').appendTo('body');
			this.modal = $('<div id="modal-window"></div>').appendTo('body');
			
			if(this.options.showClose) this.closeButton = $('<a id="modal-close" href="#">close</a>').appendTo(this.modal);
			
			this.modalContent = $('<div id="modal-content"></div>').appendTo(this.modal);

			// set overlay opacity to value in options
			this.overlay.css('opacity', this.options.overlayOpacity);
		},

		attach: function() {
			
			var self = this;
			
			// resize handler
			$(window).resize($.throttle(25, function() {
				
				// overlay and loading position
				self.positionOverlay();
				self.centerElement(self.loading);

				// optional - window resize handler
				if(self.options.centerOnResize) self.centerElement(self.modal);
			}));

			// optional - content triggered close event
			if(this.options.contentCloseDelegate != null) {
				
				this.modalContent.delegate(this.options.contentCloseDelegate, 'click', function(e) {
					
					e.preventDefault();
					self.close();
				});
			}

			// overlay click hander
			this.overlay.click(function(e) {
				
				// stop bubbling through modal
				e.stopPropagation();

				// optional - hide on overlay click
				if(self.options.overlayClickClose) {
					
					self.close();
				}
			});

			// optional - close button
			if(this.options.showClose) {
				
				// hide on close button click
				self.closeButton.click(function(e) {
					
					e.preventDefault();
					self.close();
				});
			}

			// optional - center on page scroll
			if(this.options.centerOnScroll) {
				
				jQuery(document).scroll(function() {
					
					if(self.isOpen) self.centerElement(self.modal);
				});
			}
		},
		
		initFrameworkSubscriptions: function() {

			var self = this;

			// modal subscriber shims for open and close
			this.subscriptionHandlers['/nna/openModal'] = function(e, modalContents, openCallback, closeCallback) {

				debug.log('/nna/openModal');

				self.open(modalContents, openCallback, closeCallback);
			};
			$.subscribe('/nna/openModal', this.subscriptionHandlers['/nna/openModal']);

			this.subscriptionHandlers['/nna/closeModal'] = function(e, callback) {

				debug.log('/nna/closeModal');

				self.close(callback);
			};
			$.subscribe('/nna/closeModal', this.subscriptionHandlers['/nna/closeModal']);
			
			this.subscriptionHandlers['/nna/modalShowLoading'] = function(e) {
				
				debug.log('Event: /nna/modalShowLoading');
				
				self.showLoading();
			};
			$.subscribe('/nna/modalShowLoading', this.subscriptionHandlers['/nna/modalShowLoading']);
			
			this.subscriptionHandlers['/nna/positionModal'] = function(e) {

				debug.log('/nna/positionModal');

				if(self.isOpen) self.positionModal();
			};
			$.subscribe('/nna/positionModal', this.subscriptionHandlers['/nna/positionModal']);
		},
		
		centerElement: function($element) {
			
			// usefull dimensions
			var elementWidth = $element.width();
			var elementHeight = $element.height();
			var windowWidth = $(window).width();
			var windowHeight = $(window).height();
			var scrollTop = $(window).scrollTop();

			// calculate center
			var left = (windowWidth / 2) - (elementWidth / 2);
			var top = scrollTop + ((windowHeight / 2) - (elementHeight / 2));

			// bounding
			if(top < 0 ) top = 0;
			if(left < 0) left = 0;

			// set position
			$element.css({
				top: top,
				left: left
			});
		},

		positionOverlay: function() {
			
			// ie6 alternate overlay size other browsers use css
			if($.browser.msie && parseInt($.browser.version,10) === 6) this.overlay.css('height', $(document).height());
			
			else if(navigator.userAgent.match(/iPad/i) != null || navigator.userAgent.match(/iPhone/i) != null || navigator.userAgent.match(/iPod/i) != null){
				
				this.overlay.css('height', $(document).height());
			}
		},

		positionModal: function() {
			
			this.centerElement(this.modal);
		},

		showLoading: function() {
			
			// already open just show loading indicator
			if(this.isOpen) {
				
				this.modal.fadeOut(this.options.transitionDuration);
				this.loading.fadeIn(this.options.transitionDuration);
			}
			// not open yet
			else {
				
				this.overlay.fadeIn(this.options.transitionDuration);
				this.positionOverlay();
				this.loading.fadeIn(this.options.transitionDuration);
				this.centerElement(this.loading);
			}
			
			this.isLoading = true;
		},

		open: function(content, openCallback, closeCallback) {
			var self = this;
			
			if(!this.isOpen) {
				
				if(this.isLoading) {
					
					// modal is already in loading state just open content
					this.loading.hide();
					this.modalContent.append(content);
					this.modal.fadeIn(this.options.transitionDuration, function() {
						// open complete callbacks
						self.options.onOpenComplete();
						$.publish("/nna/modalOpenComplete");
					});

					// setup one time close callback
					if(closeCallback) this.activeCloseCallback = closeCallback;

					// open start callbacks
					this.options.onOpenStart();
					if(openCallback) openCallback();

					// center modal
					this.centerElement(this.modal);

					// update state
					this.isOpen = true;
					this.isLoading = false;
					$('body').addClass('modal-active');
				} else {
					
					// fresh modal nothing is open yet
					this.overlay.fadeIn(this.options.transitionDuration, function() {
						
						self.modalContent.append(content);
						
						self.modal.fadeIn(self.options.transitionDuration, function() {
							
							// open complete callbacks
							self.options.onOpenComplete();
							$.publish("/nna/modalOpenComplete");
						});

						// setup one time close callback
						if(closeCallback) self.activeCloseCallback = closeCallback;

						// open start callbacks
						self.options.onOpenStart();
						if(openCallback) openCallback();

						// center modal
						self.centerElement(self.modal);

						// update state
						self.isOpen = true;
						self.isLoading = false;
						$('body').addClass('modal-active');
					});
					
					this.positionOverlay();
				}
			} else {
				
				// window already open just refresh content
				this.modal.hide();
				this.modalContent.empty();
				this.modalContent.append(content);
				this.modal.show();

				// open start callbacks
				if(openCallback) openCallback();
				this.options.onOpenStart();

				// center modal
				this.centerElement(this.modal);

				// update state
				this.isOpen = true;
				this.isLoading = false;
				$('body').addClass('modal-active');

				// open complete callbacks
				this.options.onOpenComplete();
				$.publish("/nna/modalOpenComplete");

				// setup one time close callback
				if(closeCallback) this.activeCloseCallback = closeCallback;
			}
		},

		close: function(callback) {
			
			var self = this;
			
			if(this.isOpen) {
				
				// if in IE, find all embedded objects and replace them with divs. fadeout doesn't play too nice them
				if($.browser.msie) {
					
					var embeddedObjects = this.modalContent.find('object');
					
					embeddedObjects.each(function(index, embObj) {
						
						embeddedObjects.replaceWith('<div id="' + embeddedObjects.attr('id') + '" />');
					});
				}

				// callback
				this.options.onCloseStart();

				// hide everything
				this.modal.fadeOut(this.options.transitionDuration, function() {
					
					self.modalContent.empty();
					self.loading.hide();
					
					self.overlay.fadeOut(self.options.transitionDuration, function() {
						
						// update state
						self.isLoading = false;
						self.isOpen = false;

						// remove class to body to signify closed modal
						$('body').removeClass('modal-active');

						// callbacks
						self.options.onCloseComplete();
						$.publish("/nna/modalCloseComplete");
						
						if(callback) callback();
						if(self.activeCloseCallback) {
							
							self.activeCloseCallback();
							self.activeCloseCallback = null;
						}
					});
				});
			}
		},
		
		destroy: function() {

			// unsubscribe all events
			for(var topic in this.subscriptionHandlers) $.unsubscribe(topic, this.subscriptionHandlers[topic]);
		}
	});
	
})(NNA, jQuery);
