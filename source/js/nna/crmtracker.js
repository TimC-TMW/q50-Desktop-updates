(function(NNA, $) {
	
	NNA.CRMTracker = Class.extend(/** @lends NNA.CRMTracker.prototype */{
		/**
			Processes CRM events
			<p>This Class <strong>subscribes</strong> to the following Class-specific topics:</p>
			<ul>
			<li><em>/nna/trackEvent [eventId, properties]</em></li>
			</ul>
			@constructs
			@author Philip Musser
			@version 1.1
			@param {Object} [options] Object containing configurable options for the CRMTracker. See following for format.
			@param {Boolean} [options.queuedMode] Toggle the queue system on or off. When on, tracking is a little slower, but more accurate.
			@param {Number} [options.queueInterval] The interval in milliseconds at which the queue is processed at 

		*/
		init: function(options) {
			
			debug.log('NNA.CRMTracker initializing');
			
			// configurable options
			this.options = {
				queuedMode: false, // enable queued mode, turn on queued mode to ensure tracking events. Slower, but more accurate
				queueInterval: 500 // crmEvents in queue will be processed on this interval
			};
			$.extend(true, this.options, options);
			
			this.eventQueue = [];
			this.queueTimeout = null;
			this.subscriptionHandlers = {};
			
			this.initEventListeners();
			
			debug.log('NNA.CRMTracker initialized');
		},
		
		/**
			Initialize pubsub subscriptions for CRM tracker.
			@private
		*/
		initEventListeners: function() {
			
			var self = this;
			
			// trigger track event
			this.subscriptionHandlers['/nna/trackEvent'] = function(e, eventId, properties) {
				
				debug.log('/nna/trackEvent: eventId: ' + eventId);
				
				self.trackEvent(eventId, properties);
			};
			$.subscribe('/nna/trackEvent', this.subscriptionHandlers['/nna/trackEvent']);
		},
		
		/**
			Track the CRM event. For most cases, this should not be called directly. Instead publish to the track event topic
			@private
			@param {Number} eventId The CRM event ID
			@param {Object} properties Object that contains key value pairs thfor that CRM event.
		*/
		trackEvent: function(eventId, properties) {
			
			if(typeof eventId === 'undefined' || eventId === null || isNaN(parseInt(eventId,10))) {

				debug.warn('Invalid event ID: ' + eventId);

				return false;
			}
			
			var self = this;
			var eventName = 'crmEvent'+eventId;
			var crmFunc = window[eventName];
			
			var eventFn = function() {
				
				try {
					
					if(typeof crmFunc === 'function') {
						
						if(properties) {
							
							debug.log('triggering ' + eventName + ' with properties');
							debug.log(properties);
						} else {
							
							debug.log('triggering ' + eventName);
						}
						
						crmFunc(properties ? properties : undefined);
					} else {

						debug.warn('triggering ' + eventName + ' failed!');
					}
					
				} catch(e) {}
			};
			
			
			if(this.options.queuedMode) {
				
				this.eventQueue.push(eventFn);
				
				if(!this.queueTimeout) this.queueTimeout = setTimeout(function(e) {
					
					self.processQueue();
				}, 0); // start queue right away!
			} else {
				
				eventFn();
			}
		},
		
		/**
			Processes the CRM event queue if queued mode is enabled.
			@private
		*/
		processQueue: function() {
			
			var self = this;
			
			if(this.eventQueue.length > 0) {
				
				debug.log('processing CRM Event Queue');
				
				var eventFn = this.eventQueue.shift();

				if(eventFn && typeof eventFn == 'function') eventFn();
				
				// set up next timeout
				this.queueTimeout = setTimeout(function(e) {
					
					self.processQueue();
					
				}, this.options.queueInterval);
			} else {
				
				this.queueTimeout = null;
				//delete CRM Cookie after the event was fired - do not need to fire it for page reload
				
				NNA.Utils.deleteCookie(NNA.GLOBALS.CRMCOOKIE);
				
				debug.log('processing CRM Event Queue complete!');
			}
			
		},
		
		/**
			Standard destruction method. Makes sure we unsubscribe subscriptions this instance is responsible for.
		*/
		destroy: function() {
			
			debug.log('destroying NNA.CRMTracker!');
			
			// stop the queue timeout if available
			if(this.queueTimeout) clearTimeout(this.queueTimeout);
			
			// unsubscribe all events
			for(var topic in this.subscriptionHandlers) $.unsubscribe(topic, this.subscriptionHandlers[topic]);
		}
	});
	
})(NNA, jQuery);
