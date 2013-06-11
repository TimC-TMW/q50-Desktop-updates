(function(NNA, $){
	
	NNA.NavCollapser = Class.extend({
		init: function(options){
			// configurable options
			this.options = {
				hideTimeout: 1000,
				initial: 4000
			};
			$.extend(true, this.options, options);

			// class attributes
			var self = this;
			this.timeout = null;
			this.navElement = $('nav.main').eq(0);
			this.footerElement = $('footer.main ul').eq(0);
			this.shrunkElement = this.footerElement.parent().find('.shrunk').eq(0);

			// init if enabled and not touch
			if(this.shrunkElement.length > 0 && Modernizr.touch === false){
				this.attach();
				this.show();
				setTimeout(function(){
					self.hide();
				}, this.options.initial);
			}

			debug.log('NNA.NavCollapser: initialized');
		},

		// attach event handlers
		attach: function(){
			var self = this;

			this.shrunkElement.on('mouseenter', function(){
				self.show();
				self.set();
			});

			this.navElement.on('mouseenter', function(){
				self.clear();
			}).on('mouseleave', function(){
				self.set();
			});

			this.footerElement.on('mouseenter', function(){
				self.clear();
			}).on('mouseleave', function(){
				self.set();
			});
		},

		// set timeout for delayed hide
		set: function(){
			var self = this;
			this.timeout = setTimeout(function(){
				self.hide();
			}, this.options.hideTimeout);
		},

		// clear timeout for delayed hide
		clear: function(){
			clearTimeout(this.timeout);
		},

		// show nav and footer
		show: function(){
			this.navElement.show();
			this.footerElement.show();
			this.shrunkElement.hide();
		},

		// hide nav and footer
		hide: function(){
			this.navElement.hide();
			this.footerElement.hide();
			this.shrunkElement.show();
		}
	});

})(NNA, jQuery);