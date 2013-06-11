(function(NNA, $) {

	NNA.Footer = Class.extend({
		init : function(options) {
			// configurable options
			this.options = {
			};
			$.extend(true, this.options, options);

			// class attributes

			// init
			this.attach();
			this.fixsg();
			this.timeoutId = "share";

			debug.log('NNA.Footer: initialized');
		},

		attach : function() {
			//Footer Share hide/show
			$("footer.main ul li.share").mouseenter(function() {
				$("footer.main ul li .addthis_toolbox").show();
				window.clearTimeout(this.timeoutId);
			}).mouseleave(function() {
				this.timeoutId = window.setTimeout(function() {
					$("footer.main ul li .addthis_toolbox").hide();
				}, 1500);
			});

			// site feedback link
			$('footer.main ul li.feedback a').on('click', function(e) {
				e.preventDefault();
				showbox('trkGloablFeedBkSurvey');
			});
		},
		
		fixsg : function() {
			// extend survey gizmo with modal events to pause / play video on site feedback
			var old_showbox = window.showbox;
			var old_hidebox = window.hidebox;
			window.showbox = function() {
				old_showbox.apply(this, arguments);
				$.publish('/nna/modalShowLoading');
				$('#modal-loading').hide();
			};
			window.hidebox = function() {
				old_hidebox.apply(this, arguments);
				$('#modal-window, #modal-overlay, #modal-loading').hide();
				$.publish("/nna/modalCloseComplete");
			};
		}
	});
})(NNA, jQuery); 