(function(NNA, $){
	
	NNA.Disclaimers = Class.extend({

		init: function($parent, options){
			// configurable options
			this.options = {
				selector : ".disclaimer_tooltip"
			};
			$.extend(true, this.options, options);
			
			// class attributes
			this.$parent = $parent;
			this.cacheRequest = {};
			this.cacheContent	= {};
			
			// initialize
			this.attach();
			
			// log initialized
			debug.log('NNA.Disclaimers: initialized');
		},
		
		// attach event handlers
		attach: function(){
			var self = this;
			
			this.$parent.on({
				click : function(e){
					e.preventDefault();
					if(Modernizr.touch){
						self.hasMousedOut = false;
						self.showDisclaimer($(this));
					}
				},
				mouseover : function(e){
					if(!Modernizr.touch){
						self.hasMousedOut = false;
						self.showDisclaimer($(this));
					}
				},
				mouseout: function(e){
					if(!Modernizr.touch) {
						self.hasMousedOut = true;
					}	
				}
			}, 'a' + this.options.selector);
		},
		
		/*
			method covers 2 cases: 
			ajax-based disclaimers (single and multiple, divided by '#[id1]|[id2]')
			and html based disclaimers assuming the following alternative markup:	
			<a class="disclaimer" href="#">Disclaimer</a>
			<div class="qtip_content">
				<p class="last_disclaimer">Lorem ipsum dolor...</p>
			</div>
		*/
		showDisclaimer : function($disclaimer){
			var self            = this;
			var $sibling        = $disclaimer.next(".qtip_content").clone();
			var hasSibling      = ($sibling.length > 0) ? true : false;
			var arrUrls         = ($disclaimer.attr("href") !== '#') ? $disclaimer.attr("href").split("|") : null;
			var arrPaths        = [];
			var arrTempKeys		= [];
			var arrKeysHelper	= [];
			var $disclaimerCopy = $([]);
			
			if (arrUrls === null){
				// May need to add better precision here
				$disclaimerCopy = $disclaimer.parents('div').first().find('.tooltip_content').first().children().clone();
				if(!self.hasMousedOut){
					self.setUpDisclaimerQtip($disclaimer, $disclaimerCopy);
				}	
			} else if (!hasSibling) {
				//helper arrays
				for (var i = 0, max = arrUrls.length; i < max; i++) {
					if (arrUrls[i].indexOf('.') > -1) {
						arrPaths.push(arrUrls[i]);
						arrTempKeys[i] = arrPaths[i].substr(0, arrPaths[i].indexOf('.')).split('/');
						arrKeysHelper.push(arrTempKeys[i][arrTempKeys[i].length -1]);
					}
				}
				getDisclaimers();	
			} else {
				$disclaimerCopy = $sibling;
				if(!self.hasMousedOut){
					self.setUpDisclaimerQtip($disclaimer, $disclaimerCopy);
				}	
			}
			
			function getDisclaimers() {
				var url = arrPaths.shift();
				var key = arrKeysHelper.shift();

				//check for cache object first
				if (self.cacheContent && self.cacheContent[key]) {
					var disclaimerID = url.substr(url.indexOf('#'));
					$disclaimerCopy = $disclaimerCopy.add($(self.cacheContent[key]).find(disclaimerID + ' .disclaimer-copy'));
					if (arrPaths.length > 0) {
						getDisclaimers();
					} else {
						if(!self.hasMousedOut){
							self.setUpDisclaimerQtip($disclaimer, $disclaimerCopy);
						}
					}
				} else {
					$.ajax({
						url      : url,
						dataType : "html",
						success: function (html) {
							var disclaimerID = url.substr(url.indexOf('#'));
							$disclaimerCopy = $disclaimerCopy.add($(html).find(disclaimerID + ' .disclaimer-copy'));
							if (arrPaths.length > 0) {
								getDisclaimers();
							} else {
								if(!self.hasMousedOut){
									self.setUpDisclaimerQtip($disclaimer, $disclaimerCopy);
								}
							}
							//create cache based on the current response
							self.cacheContent[key] = html;
							self.cacheRequest[key] = url;
						}
					});
				}
			}
		},
		
		setUpDisclaimerQtip : function($disclaimer, $disclaimerContent){
			var isScroll = $disclaimerContent.hasClass("scroll");
			var $disclaimerTemplate = $("<div class='disclaimer-content'></div>");
			
			$disclaimerTemplate.html($disclaimerContent);
			
			var content = { text : $disclaimerTemplate };
			
			if(isScroll){
				$disclaimer.qtip(NNA.QTipConfigFactory.build("disclaimer", {
					content: content,
					events:{
						visible: function(event, api) {
							var $target = $(event.currentTarget);
							debug.log($target.find('.scroll'));
							$target.find('.scroll').jScrollPane();
						}
					}
				}));
			}
			else{
				$disclaimer.qtip(NNA.QTipConfigFactory.build("disclaimer", { content: content }));
			}
		}
	});
	
})(NNA, jQuery);