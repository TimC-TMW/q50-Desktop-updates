(function(NNA, $){
	
	NNA.Nav = Class.extend({
		init: function(videoData, options){
			// configurable options
			this.options = {
				hoverDuration: 300
			};
			$.extend(true, this.options, options);

			// class attributes
			this.videoData = videoData;
			this.navElement = $('nav.main').eq(0);
			this.currentNavItem = this.navElement.find('.current');
			this.chapterElements = $();

			// init
			this.buildVideoNav();
			this.attach();
			this.initSubscriptions();

			debug.log('NNA.Nav: initialized');
		},

		// attach event handlers
		attach: function(){
			var self = this;
			var hoverTimeout = null;

			// hover with timeout
			if(!Modernizr.touch){
				/*this.navElement.on('mouseenter', 'ul.left > li', function(e){
					var navItem = $(this);
					hoverTimeout = setTimeout(function(){
						self.showVideoNav(navItem);
					}, self.options.hoverDuration);
				}).on('mouseleave', 'ul.left > li', function(e){
					clearTimeout(hoverTimeout)
					self.hideVideoNav();
				});*/
			}else{
				/*this.navElement.on('touchstart', 'ul.left > li', function(e){
					e.preventDefault();
					var navItem = $(this);
					if(navItem.hasClass("open")){
						self.hideVideoNav();
					}else{
						self.showVideoNav(navItem);
					}
				});
				$(document.body).on('touchstart', function(e){
					if($(e.target).parents('ul.left').length === 0){
						self.hideVideoNav();
					}
				});*/
			}

			// chapter selection
			this.navElement.on('click touchstart', 'ul ul li', function(e){
				e.preventDefault();
				
				var id = $(this).data('chapter-id');
				var url = $(this).parents('li').children('a').attr('href');
				var index = $(this).index();

				// redirect to correct page and deeplink to chapter 
				if(window.location.href.indexOf(url) < 0){
					// first chapter does not need deeplink param
					if(index > 0)window.location.href = url + '?chapter=' + id;
					else window.location.href = url;
				}
				// on current page just seek to chapter
				else{
					$.publish('/nna/videofeature/seekChapter', [id]);
				}
			});

			// mute button
			this.navElement.on('click touchstart', 'li.sound a', function(e){
				e.preventDefault();
				$.publish('/nna/toggleAudio');
			});
		},

		// set up subscriptions this object will respond to
		initSubscriptions: function(){
			var self = this;

			/*$.subscribe('/nna/videofeature/events/chapter', function(e, chapterEvent){
				self.highlightCurrentChapter(chapterEvent.id);
			});
			
			$.subscribe('/nna/videofeature/events/marker', function(e, chapterEvent){
				self.highlightCurrentChapter(chapterEvent.id);
			});*/

			$.subscribe('/nna/audioToggled', function(e, state){
				if(state) self.navElement.find('li.sound').removeClass('mute');
				else self.navElement.find('li.sound').addClass('mute');
			});
		},

		// build out video nav from json
		buildVideoNav: function(){
			var self = this;

			// loop over nav items that are associated with a video
			this.navElement.find('ul.left li[data-video-id]').each(function(){
				// determine what video the nav item is associated to
				var videoId = $(this).data('video-id');

				// loop over timeline events for the appropriate video
				for(var i = 0; i < self.videoData[videoId].timeline.length; i++){
					// get event from timeline
					var timelineEvent = self.videoData[videoId].timeline[i];

					// for each chapter event we will create a nav item
					if(timelineEvent.type === 'CHAPTER' || timelineEvent.type === 'MARKER'){
						// create chapter nav element
						var chapterElement = $('<li class="loaded"><div><img src="" width="84" height="38" alt="" /></div><span></span></li>');

						// update element with chapter data
						chapterElement.data('chapter-id', timelineEvent['id']);
						chapterElement.find('img').attr({ src: timelineEvent['thumbnail'], alt: timelineEvent['label'] });
						chapterElement.find('span').html(timelineEvent['label']);

						// append to nav
						$(this).find('ul').append(chapterElement);
					}
				}
			});

			// store chapter elements
			this.chapterElements = this.navElement.find('.video_nav ul li');
		},

		// show the requested video nav
		showVideoNav: function(nav){
			this.hideVideoNav();
			if(nav[0] !== this.currentNavItem[0]) this.currentNavItem.addClass('hide_current');
			nav.addClass('open');
		},

		// hide any open video navs
		hideVideoNav: function(){
			this.navElement.find('.open').removeClass('open');
			this.currentNavItem.removeClass('hide_current');
		},

		// highlight a chapter as current using it's id
		highlightCurrentChapter: function(id){
			this.chapterElements.filter('.current').removeClass('current');
			this.chapterElements.each(function(){
				var chapterElement = $(this);
				if(chapterElement.data('chapter-id') === id){
					chapterElement.addClass('current');
					return false;
				}
			});
		}
	});

})(NNA, jQuery);