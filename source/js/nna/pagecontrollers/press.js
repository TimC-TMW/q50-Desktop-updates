(function(NNA, $){

	NNA.PageControllers.Press = NNA.PageController.extend({
		init: function(videoData, options){
			this._super(videoData, options);
			
			debug.log('NNA.PageControllers.Press: initialized');
		}
	});
	
})(NNA, jQuery);