(function(NNA, $){

	NNA.PageControllers.Specs = NNA.PageController.extend({
		init: function(videoData, options){
			this._super(videoData, options);

			// init
			this.initTabs();
			this.initHeader();
			this.initLists();

			debug.log('NNA.PageControllers.Specs: initialized');
		},

		// attach event handlers this is automatically called by the superclass
		attach: function(){
			this._super();
			
			// disclaimer functionality at bottom of tab pages
			$('#specs').on('click', '.disclaimers', function(e){
				var element = $(this);
				element.toggleClass('closed');
			});
		},

		// initialize tab switching functionality
		initTabs: function(){
			// Tabs functionality
			$('#specs .tabs').on('click', 'li', function() {
				// Declare vars
				var $currTab = $(this),
					currIndex = $currTab.index();

				// Remove selected class from all tabs and apply it to the appropriate tab
				$currTab.addClass('selected').siblings().removeClass('selected');

				// Swap out tab content/download visibility
				// $('#specs .download li').eq(currIndex).show().siblings().hide();
				$('#specs .tab_contents .content').eq(currIndex).show().siblings().hide();

				// Publish to CRM events
				if ($currTab.data('tab') === 'Compare') {
					$.publish('/nna/specs/change', ['All', 'Compare']);
				}
			});

			// Hide all but primary tab content
			$('#specs .tabs li').eq(0).trigger('click');
		},

		// initialize specifications header functionality
		initHeader: function(){
			var $window = $(window),
				$header = $('#content_specifications header.primary'),
				$header_expand = $('#content_specifications .list.specifications ul.expand_collapse'),
				headerTop = $header.offset().top;

			// Sticky header functionality
			$window.scroll(function(){
				var top = $window.scrollTop();

				if (top >= headerTop) {
					$header.addClass('sticky');
					$header_expand.css({'z-index' : 0});
				} else {
					$header.removeClass('sticky');
					$header_expand.css({'z-index' : 8});
				}
			});

			// Download PDF functionality
			$('#specs ul.download').on('click', 'li a', function() {
				// Publish to CRM events
				$.publish('/nna/specs/downloadPDF');
			});

			// Filter functionality
			$('#specs .filter ul.options').on('click', 'li', function() {
				// Declare vars
				var $currFilter = $(this),
					$standardTrims = $('.trims .trim.standard'),
					$hybridTrims = $('.trims .trim.hybrid'),
					engineType = $currFilter.data('engine-type');

				// Remove selected class from all options and apply it to the appropriate option
				$currFilter.addClass('selected').siblings().removeClass('selected');

				// Show/hide appropriate trims
				if (engineType == 'hybrid') {
					$hybridTrims.show();
					$standardTrims.hide();
				} else {
					$hybridTrims.hide();
					$standardTrims.show();
				}

				// Publish to CRM events
				$.publish('/nna/specs/change', [engineType, 'All']);
			});
		},

		// initialize list/sub-list functionality
		initLists: function(){
			// Close all but the first sub-list by default
			$('#specs .sub_list:not(.first)').addClass('closed');

			// Expand/Collapse all functionality
			$('#specs .list .expand_collapse .expand').click(function() {
				var $list = $(this).parents('div.list'),
					$subLists = $list.children('.sub_list');

				if ($list.hasClass('closed')) {
					$list.removeClass('closed');
				}

				$subLists.removeClass('closed');
			});

			$('#specs .list .expand_collapse .collapse').click(function() {
				var $subLists = $(this).parents('div.list').children('.sub_list');

				$subLists.addClass('closed');
			});

			// Expand/Collapse functionality for lists
			$('#specs .list header h2').bind('click', function() {
				var $list = $(this).parents('div.list'),
					category = $list.data('category'),
					engineType = $('#specs .filter ul.options li.selected').data('engine-type');

				// Publish to CRM events
				if ($list.hasClass('closed')) {
					if ($list.hasClass('specifications')) {
						$.publish('/nna/specs/change', [engineType, 'Spec All']);
					} else if ($list.hasClass('packages')) {
						$.publish('/nna/specs/change', [engineType, 'Package All']);
					}
				}

				$list.toggleClass('closed');
			});

			// Expand/Collapse functionality for sub-lists
			$('#specs .sub_list header').click(function() {
				var $list = $(this).parents('div.list'),
					$subList = $(this).parents('div.sub_list'),
					category = $subList.data('category');
					engineType = $('#specs .filter ul.options li.selected').data('engine-type');

				// Publish to CRM events
				if ($subList.hasClass('closed')) {
					if ($list.hasClass('specifications')) {
						$.publish('/nna/specs/change', [engineType, 'Spec ' + category]);
					} else if ($list.hasClass('packages')) {
						$.publish('/nna/specs/change', [engineType, 'Package ' + category]);
					}
				}

				$subList.toggleClass('closed');
			});
		},
	});
	
})(NNA, jQuery);