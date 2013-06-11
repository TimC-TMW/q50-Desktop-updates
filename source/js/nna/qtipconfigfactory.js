(function(NNA, $){
	
	/** 
		Configuration Factory for qTip
		<p>Usage:<br />
		Get an existing specific configuration:<br />
		shoppingTools.qtip.ConfigFactory.getInstance().build("type");<br />
		shoppingTools.qtip.ConfigFactory.getInstance().build("type", {extra:1, properties:2});</p>
		<p>Extend the base config without a preset configuration:<br />
		shoppingTools.qtip.ConfigFactory.getInstance().build({extra:1, properties:2});</p>
		<p>Basically you can specify any number of types and objects and their properties will be applied in the order that they are specified when the build() method is called.</p>
		@author Critical Mass
		@version 1.0
		@namespace
	*/
	NNA.QTipConfigFactory = {
		
		baseConfig : {
			position: {
				adjust: {
					screen: true, // http://craigsworks.com/projects/qtip_new/docs/position/#adjust.screen
					mouse:false // http://craigsworks.com/projects/qtip_new/docs/position/#adjust.mouse
				},
				my:'bottom center',
				at:'top center'
			},
			style:{
				tip:{
					corner:true,
					border:1,
					width:12,
					height:12
				}
			}
		},
		
		
		configs : {
			"_fixed":{
				show:{ solo:true },// This was included in the existing configs but it may be unneccessary for this modifier
				hide: {
					fixed: true,
					event: 'mouseout',
					delay: 200,
					effect:false
				}
			},
			"_rightaligned":{
				style: {
					tip: {
						corner: 'left center'
					}
				}
			},
			// MODIFIER: Shows the tool tip when it's built or on the document ready function.
			"_onready":{
				show: {
					ready: true
				}
			},					
			// MODIFIER: Sets the delay to 0 for both showing and hiding
			"_nodelay":{
				show:{ delay:0 },
				hide:{ delay:0 }
			},
			// MODIFIER: Causes the tooltip to hide instantly
			"_instanthide":{
				hide:{ effect:false }
			},
			// MODIFIER: Causes the tooltip to hide instantly
			"_shadow":{
				style: {
					classes: 'ui-tooltip-shadow'
				}
			},				
			// CONFIG: Used for Conflict Tooltips
			"disclaimer":{	
				position: {
					adjust: {
						resize: true,
						method: "shift flip"
					},
					my: "bottom center",
					at: "top center",
					viewport: jQuery(window)
				},
				style: {
					classes: "ui-tooltip-disclaimer",
					tip: {
						width: 15,
						height: 12
					}
				},
				show: {
					ready: true,
					solo: true,
					event : "mouseover click"
				},
				hide: {
					fixed: true,
					event : "mouseout click"
				}
			}
		},
		
		build : function(){
			// scope
			var factoryObj = this;
			var newConfig = {};
			$.extend(true, newConfig, factoryObj.baseConfig);
			$(arguments).each(function(index, value) {
				if (typeof value === "string" && factoryObj.configs.hasOwnProperty(value)) {
					$.extend(true, newConfig, factoryObj.configs[value]);
				}
				else if (typeof value === "object") {
					$.extend(true, newConfig, value);
				}
			});
			
			return newConfig;
		},
		
		registerConfig : function (name, config) {
			this.configs[name] = config;
		}
	};
})(NNA, jQuery);