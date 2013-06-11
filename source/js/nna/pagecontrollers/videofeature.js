(function(NNA, $){

	NNA.PageControllers.VideoFeature = NNA.PageController.extend({
		init: function(videoData, videoId, options){
			this._super(videoData, options);

			this.videoFeature = new NNA.VideoFeature('section.video_feature .background', videoData[videoId],{
				nextPage: this.options.nextPage
			});
			
			debug.log('NNA.PageControllers.Video: initialized');
		}
	});
	
})(NNA, jQuery);