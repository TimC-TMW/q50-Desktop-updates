(function(NNA, $) {
	NNA.PanoramaViewer = Class.extend(/** @lends NNA.PanoramaViewer.prototype */{
		/**
			For displaying panoramas. Wrapper for krpano implementation. 
			<p>This Class (more specifically, krpano) <strong>publishes</strong> to the following Class-specific topics:</p>
			<ul>
			<li><em>/nna/pano/startupComplete</em></li>
			<li><em>/nna/pano/loadingScene [panoIndex | loadedFromExternalScene]</em></li>
			<li><em>/nna/pano/loadedScene</em></li>
			<li><em>/nna/pano/openHotspot [hotspotLabel | hotspotURL]</em></li>
			<li><em>/nna/pano/hotspotsShown</em></li>
			<li><em>/nna/pano/hotspotsHidden</em></li>
			<li><em>/nna/pano/gyroToggled</em></li>
			<li><em>/nna/pano/exit <-- should be handled by this class's instantiator</em></li>
			</ul>
			<p><strong>*** Note that there is major caveats to using pub/sub in combination with krpano. parameters being passed
		back are in a single string, deliniated by a |</strong></p>
			@constructs
			@author Philip Musser
			@version 1.1
			@param {DOMElement|jQuery|String} labelElement DOM element, jQuery wrapped element or CSS selector of the paginator interface.
			@param {Object} [options] Object containing configurable options for this Class
		*/
		init: function($panoContainer, filePath, options) {
			
			debug.log('NNA.PanoramaViewer initializing');
			
			this.options = {
				initialSceneIndex: 0, // zero based index
				panoIdPrefix: 'krpanoObject',
				panoWrapperPrefix: 'krpanoWrapper',
				xml: 'tour.xml'
			};
			$.extend(true, this.options, options);

			this.$panoContainer = $panoContainer;
			this.filePath = filePath;
			this.viewer;
			this.krpano;
			this.ready = false;
			this.currentSceneIdx = this.options.initialSceneIndex;
			this.firstLoad = false;
			this.subscriptionHandlers = {};
			
			var date = new Date();
			this.targetId = this.options.panoWrapperPrefix + '_' + date.getTime(); // generate unique ID
			this.panoId = this.options.panoIdPrefix + '_' + date.getTime(); // generate unique ID

			this.$panoContainer.attr('id', this.targetId);

			debug.log('NNA.PanoramaViewer: panoID = ' + this.panoID);
			
			// set up subscriptions
			this.initSubscriptions();

			// initialize panorama
			this.viewer = createPanoViewer({swf: this.filePath+'/krpano.swf', id:this.panoId, target:this.targetId});
			
			this.viewer.useHTML5('prefer');
			this.viewer.addVariable('xml', this.filePath + '/' + this.options.xml);
			this.viewer.addVariable('initialSceneIndex', this.options.initialSceneIndex);

			// slower, but we need to be able to overlay HTML
			this.viewer.addParam('wmode', 'transparent');
			// this.viewer.addParam('wmode', 'opaque');

			this.viewer.addParam('bgcolor', '#000000');

			this.viewer.embed();
			 
			debug.log('NNA.PanoramaViewer initialized');
		},
		
		initSubscriptions: function() {
			
			var self = this;
			
			this.subscriptionHandlers['/nna/pano/startupComplete'] = function(e) {
				
				debug.log('pano triggered: /nna/pano/startupComplete');
				
				self.ready = true;
				self.krpano = document.getElementById(self.panoId);
				
				$.publish('/nna/panoramaviewer/startupComplete', [self.panoId]);
				$.publish('/nna/panoramaviewer/loadingScene', [self.panoId, self.options.initialSceneIndex]);
			};
			$.subscribe('/nna/pano/startupComplete', this.subscriptionHandlers['/nna/pano/startupComplete']);
			
			this.subscriptionHandlers['/nna/pano/openHotspot'] = function(e, params) {
				
				debug.log('pano triggered: /nna/pano/openHotspot');
				debug.log('/nna/pano/openHotspot: parameters:');
				
				var parsedParams = self.parseParameterString(params);
				debug.log(parsedParams);
				
				$.publish('/nna/panoramaviewer/openHotspot', [self.panoId, parsedParams[0], parsedParams[1]]);
			};
			$.subscribe('/nna/pano/openHotspot', this.subscriptionHandlers['/nna/pano/openHotspot']);
			
			this.subscriptionHandlers['/nna/pano/loadedScene'] = function(e) {
				
				debug.log('pano triggered: /nna/pano/loadedScene');
			
				$.publish('/nna/panoramaviewer/loadedScene', [self.panoId]);
			};
			$.subscribe('/nna/pano/loadedScene', this.subscriptionHandlers['/nna/pano/loadedScene']);
			
			this.subscriptionHandlers['/nna/pano/loadingScene'] = function(e, params) {
				var triggerSceneChange = false;
				debug.log('pano triggered: /nna/pano/loadingScene');
				debug.log('/nna/pano/loadingScene: parameters:' + params);
				
				var parsedParams = self.parseParameterString(params);
				debug.log(parsedParams);

				if(this.firstLoad == false || this.currentSceneIdx != parsedParams[0]){
					triggerSceneChange = true;
					this.firstLoad = true;
				}
				this.currentSceneIdx = parsedParams[0];
				
				if(triggerSceneChange){
					// params in order are: sceneIndex, fromInternalLoad
					$.publish('/nna/panoramaviewer/loadingScene', [self.panoId, parsedParams[0], parsedParams[1]]);
				}
			};
			$.subscribe('/nna/pano/loadingScene', this.subscriptionHandlers['/nna/pano/loadingScene']);
			
			this.subscriptionHandlers['/nna/pano/hotspotsShown'] = function(e, params) {
				
				debug.log('pano triggered: /nna/pano/hotspotsShown');
				
				$.publish('/nna/panoramaviewer/hotspotsShown', [self.panoId]);
			};
			$.subscribe('/nna/pano/hotspotsShown', this.subscriptionHandlers['/nna/pano/hotspotsShown']);
			
			this.subscriptionHandlers['/nna/pano/hotspotsHidden'] = function(e, params) {
				
				debug.log('pano triggered: /nna/pano/hotspotsHidden');
				
				$.publish('/nna/panoramaviewer/hotspotsHidden', [self.panoId]);
			};
			$.subscribe('/nna/pano/hotspotsHidden', this.subscriptionHandlers['/nna/pano/hotspotsHidden']);
			
			this.subscriptionHandlers['/nna/pano/mousedown'] = function(e, params) {
				
				debug.log('pano triggered: /nna/pano/mousedown');
				
				$.publish('/nna/panoramaviewer/mousedown', [self.panoId, this.currentSceneIdx]);
			};
			$.subscribe('/nna/pano/mousedown', this.subscriptionHandlers['/nna/pano/mousedown']);
		},
		
		parseParameterString: function(params) {
			
			return params.split('|');
		},
		
		isReady: function() {
			
			return this.ready;
		},
		
		loadScene: function(panoramaIndex) {
			
			debug.log('NNA.PanoramaViewer loadScene '+ panoramaIndex);
			
			if(this.ready) this.krpano.call('externalLoadScene('+panoramaIndex+')');
		},
		
		freeze: function() {
			
			debug.log('NNA.PanoramaViewer freeze viewer');
			
			if(this.ready) this.krpano.call('freezeview(true)');
		},
		
		unfreeze: function() {
			
			debug.log('NNA.PanoramaViewer unfreeze viewer');
			
			if(this.ready) this.krpano.call('freezeview(false)');
		},
		
		showHotspots: function() {
			
			debug.log('NNA.PanoramaViewer show hotspots');
			
			if(this.ready) this.krpano.call('showHotSpots()');
		},
		
		hideHotspots: function() {
			
			debug.log('NNA.PanoramaViewer hide hotspots');
			
			if(this.ready) this.krpano.call('hideHotSpots()');
		},
		
		toggleGyro: function() {
			
			debug.log('NNA.PanoramaViewer toggle gyro');
			
			if(this.ready) this.krpano.call('toggleGyro()');
		},
		
		destroy: function() {
			
			debug.log('destroying NNA.PanoramaViewer!');
			
			// unsubscribe all events
			for(var topic in this.subscriptionHandlers) $.unsubscribe(topic, this.subscriptionHandlers[topic]);
			
			// *** WARNING Cleanup is a hack and not completely safe or tested, since krpano doesn't include a way to deal with this properly
			try {

				for(var i=0;i<SWFkrpanoMouseWheel.instances.length;i++) {

					if(SWFkrpanoMouseWheel.instances[i].so.getAttribute('id') == this.panoId) {
						
						SWFkrpanoMouseWheel.instances.splice(i, 1);

						break;
					}
				}
				
			}catch(e) {}
			
			// destroy panorama viewer
			this.viewer = null;
			this.$panoContainer.empty();
		}
	});
})(NNA, jQuery);
