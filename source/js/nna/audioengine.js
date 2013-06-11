(function(NNA, $){
	
	NNA.AudioEngine = Class.extend(/** @lends NNA.AudioEngine.prototype */{
		/**
			Audio engine provides support for playing sound on a page. Current implementation uses <a href="http://www.schillmania.com/projects/soundmanager2/">soundmanager2</a>.
			<p>This Class <strong>subscribes</strong> to the following Class-specific topics:</p>
			<ul>
			<li><em>/nna/audioEngine/mute</em></li>
			<li><em>/nna/audioEngine/unmute</em></li>
			<Li><em>/nna/audioEngine/cacheSound [soundId, soundFilePath]</em></li>
			<li><em>/nna/audioEngine/playSoundById [soundId, soundOptions]</em></li>
			<li><em>/nna/audioEngine/playPageBackgroundSoundById [soundId]</em></li>
			<li><em>/nna/audioEngine/playComponentBackgroundSoundById [soundId]</em></li>
			<li><em>/nna/audioEngine/playVoiceoverSoundById [soundId]</em></li>
			<li><em>/nna/audioEngine/stopVoiceoverSound [soundId]</em></li>
			<li><em>/nna/audioEngine/updateDefaultPageBackgroundVolume [newVolume]</em></li>
			</ul>
			@constructs
			@author Phil Musser
			@version 1.0
			@param {Object} [options] Object containing configurable options for the Sound Manager
		*/
		init: function(options){
			// configurable options
			this.options = {
				defaultPageBackgroundVolume: 70,
				defaultComponentBackgroundVolume: 70,
				voiceoverBackgroundVolume: 40,
				blurredBackgroundVolume: 0,
				fadeOutPercentagePerTick: 20
			};
			$.extend(true, this.options, options);

			this.audioEngineInitialized = false;
			this.muted = false;
			this.backgroundSoundFaded = false;
			this.defaultPageBackgroundVolume = this.options.defaultPageBackgroundVolume;
			this.currentPageBackgroundSoundId;
			this.currentComponentBackgroundSoundId;
			this.currentVoiceoverSoundId;
			this.delayedCacheSounds = [];
			this.delayedVoiceoverSoundId;
			this.delayedPageBackgroundSoundId;
			this.delayedComponentBackgroundSoundId;
			this.blurred = false; // keep track of the blurred state. eg. if modal is open.

			var self = this;

			this.attach();

			// initialize soundmanager2
			soundManager.onready(function() {self.SM2Ready();});

			soundManager.ontimeout(function() {
				
				debug.warn('NNA.AudioEngine: soundmanager2 could not start. Flash missing, blocked, no support?');
			});

			// log initialized, happens when SM2 is ready
			debug.log('NNA.AudioEngine: initialized');
		},

		SM2Ready: function() {
			var self = this;

			this.audioEngineInitialized = true;

			if(this.muted) this.mute();

			if(this.delayedCacheSounds.length > 0) {

				debug.log('NNA.AudioEngine: executing cached preload events.');

				while(this.delayedCacheSounds.length > 0) {

					var cacheFn = this.delayedCacheSounds.shift();

					if(typeof cacheFn === 'function') cacheFn();
				}
			}

			// kick off background and voiceover if needed
			if(this.delayedVoiceoverSoundId) {
			
				this.playVoiceoverSoundById(this.delayedVoiceoverSoundId);
				this.delayedVoiceoverSoundId = null;
			}

			if(this.delayedPageBackgroundSoundId) {

				this.playPageBackgroundSoundById(this.delayedPageBackgroundSoundId);
				this.delayedPageBackgroundSoundId = null;
			}

			if(this.delayedComponentBackgroundSoundId) {

				this.playComponentBackgroundSoundById(this.delayedComponentBackgroundSoundId);
				this.delayedComponentBackgroundSoundId = null;
			}

			// log initialized
			debug.log('NNA.AudioEngine: Ready!');
		},

		attach: function() {
			var self = this;
			
			// mute and unmute
			$.subscribe('/nna/audioEngine/mute', function(e) {

				debug.log('/nna/audioEngine/mute');

				self.mute();
			});
			$.subscribe('/nna/audioEngine/unmute', function(e) {

				debug.log('/nna/audioEngine/unmute');

				self.unmute();
			});

			// add subscription to playing sounds
			$.subscribe('/nna/audioEngine/playSoundById', function(e, soundId, soundOptions) {
				
				debug.log('/nna/audioEngine/playSoundById: soundId: ' + soundId);

				self.playSoundById(soundId, soundOptions);
			});

			// pre-cache sound
			$.subscribe('/nna/audioEngine/cacheSound', function(e, soundId, soundFilePath) {
				
				debug.log('/nna/audioEngine/cacheSound: soundId: '+ soundId + ' soundFilePath: ' + soundFilePath);

				self.cacheSound(soundId, soundFilePath);
			});

			$.subscribe('/nna/audioEngine/playPageBackgroundSoundById', function(e, soundId) {

				debug.log('/nna/audioEngine/playPageBackgroundSoundById: soundId: ' + soundId);

				self.playPageBackgroundSoundById(soundId);
			});

			$.subscribe('/nna/audioEngine/stopPageBackgroundSound', function(e) {

				debug.log('/nna/audioEngine/stopPageBackgroundSound');

				self.stopPageBackgroundSound();
			});

			$.subscribe('/nna/audioEngine/stopComponentBackgroundSound', function(e) {

				debug.log('/nna/audioEngine/stopComponentBackgroundSound');

				self.stopComponentBackgroundSound();
			});
			
			$.subscribe('/nna/audioEngine/playComponentBackgroundSoundById', function(e, soundId) {

				debug.log('/nna/audioEngine/playComponentBackgroundSoundById: soundId: ' + soundId);

				self.playComponentBackgroundSoundById(soundId);
			});

			$.subscribe('/nna/audioEngine/playVoiceoverSoundById', function(e, soundId) {

				debug.log('/nna/audioEngine/playVoiceoverSoundById: soundId: ' + soundId);

				self.playVoiceoverSoundById(soundId);
			});

			$.subscribe('/nna/audioEngine/stopVoiceoverSound', function(e, soundId) {

				debug.log('/nna/audioEngine/stopVoiceoverSound: soundId: '+ soundId);

				self.stopVoiceoverSound(soundId);
			});

			$.subscribe('/nna/audioEngine/updateDefaultPageBackgroundVolume', function(e, newVolume) {

				debug.log('/nna/audioEngine/updateDefaultPageBackgroundVolume: newVolume: ' + newVolume);

				if((newVolume != null || newVolume != undefined) && newVolume != self.defaultPageBackgroundVolume) {

					self.defaultPageBackgroundVolume = newVolume;

					// check if we should fade the background audio
					if(!self.currentVoiceoverSoundId && self.currentPageBackgroundSoundId) {

						self.transitionVolume(self.currentPageBackgroundSoundId, self.defaultPageBackgroundVolume);
					}
				}
			});

			// audio should be muted when modal is open
			$.subscribe('/nna/modalOpenComplete', function(e) {

				self.blurred = true;

				//if(self.audioEngineInitialized) soundManager.mute();

				// if(self.audioEngineInitialized) {

				// 	if(self.currentPageBackgroundSoundId) self.transitionVolume(self.currentPageBackgroundSoundId, self.options.blurredBackgroundVolume);
				// 	if(self.currentVoiceoverSoundId) {
				// 		self.fadeSoundOut(self.currentVoiceoverSoundId, self.options.fadeOutPercentagePerTick, function() {

				// 			self.currentVoiceoverSoundId = null;
				// 		});
				// 	}
				// }
			});

			$.subscribe('/nna/modalCloseComplete', function(e) {

				self.blurred = false;
				//if(self.audioEngineInitialized && !self.muted) soundManager.unmute();

				// if(self.audioEngineInitialized && !self.muted) {

				// 	if(self.currentPageBackgroundSoundId) self.transitionVolume(self.currentPageBackgroundSoundId, self.defaultPageBackgroundVolume);
				// }
			});

			// attach window blur and focus events, because nobody likes audio playing in background :)
			// PM -- may need further tweaking, since there is issues with focus for elements like videos going fullscreen
			// $(window).bind('focus',function(e) {

			// 	if(self.audioEngineInitialized && !self.muted) soundManager.unmute();
			// }).bind('blur', function(e) {

			// 	if(self.audioEngineInitialized) soundManager.mute();
			// });
		},

		fadeSoundIn: function(soundId, soundOptions, amount, completeCallback) {

			if(this.audioEngineInitialized && soundId) {

				var self = this;
				var soundObj = soundManager.getSoundById(soundId);
				
				if(soundObj) {

					if(soundObj.playState === 0) {

						soundObj.setVolume(0);
						soundObj.play(soundOptions);
					}

					var vol = soundObj.volume;

					if (vol == 100) {
						soundObj.fadeTimeoutId = null;
						if(completeCallback && typeof completeCallback == 'function') completeCallback();
						return false;
					}
					
					soundObj.setVolume(Math.min(100,vol+amount));
					soundObj.fadeTimeoutId = setTimeout(function(){self.fadeSoundIn(soundId,null,amount,completeCallback);},140);
				}
			}
		},
		
		fadeSoundOut: function(soundId, amount, completeCallback) {

			if(this.audioEngineInitialized && soundId) {

				var self = this;
				var soundObj = soundManager.getSoundById(soundId);
				
				if(soundObj) {
					var vol = soundObj.volume;
					if (vol === 0) {
						soundObj.stop();
						soundObj.setVolume(100); // reset volume
						soundObj.fadeTimeoutId = null;
						if(completeCallback && typeof completeCallback == 'function') completeCallback();
						return false;
					}
					
					soundObj.setVolume(Math.max(0,vol-amount));
					soundObj.fadeTimeoutId = setTimeout(function(){self.fadeSoundOut(soundId,amount,completeCallback);},140);
				}
			}
		},

		mute: function() {

			if(this.audioEngineInitialized) {
							
				soundManager.mute();
			}

			this.muted = true;
			
			NNA.GLOBALS.AUDIOMUTED = true;
		},

		unmute: function() {

			if(this.audioEngineInitialized) {

				soundManager.unmute();
			}

			this.muted = false;

			NNA.GLOBALS.AUDIOMUTED = false;
		},

		transitionVolume: function(soundId, newVolume, completeCallback) {

			if(this.audioEngineInitialized && soundId) {

				var self = this;
				var soundObj = soundManager.getSoundById(soundId);

				if(soundObj) {

					clearTimeout(soundObj.fadeTimeoutId);
					soundObj.fadeTimeoutId = null;

					var currentVolume = soundObj.volume;
					var increment = 10;
					
					if(currentVolume > newVolume) increment = increment*-1;

					this.fadeTo(soundObj, newVolume, increment, completeCallback);
				}
			}
		},

		fadeTo: function(soundObj, endVolume, increment, completeCallback) {

			var self = this;
			var vol = soundObj.volume;
			var newVolume = vol + increment;

			if((increment < 0 && newVolume <= endVolume) || (increment > 0 && newVolume >= endVolume)) {
				soundObj.setVolume(endVolume);
				soundObj.fadeTimeoutId = null;
				if(completeCallback && typeof completeCallback == 'function') completeCallback();
				return false;
			}

			soundObj.setVolume(newVolume);
			soundObj.fadeTimeoutId = setTimeout(function(){self.fadeTo(soundObj,endVolume,increment,completeCallback);},140);
		},

		playSoundById: function(soundId, soundOptions) {

			if(this.audioEngineInitialized && soundId) {

				var soundObj = soundManager.getSoundById(soundId);
					
				if(soundObj) soundObj.play(soundOptions);
			} else {

				debug.warn('NNA.AudioEngine: playSoundById called but audio engine not initialized!');
			}
		},

		cacheSound: function(soundId, soundFilePath) {

			if(this.audioEngineInitialized) {

				soundManager.createSound({
					id: soundId,
					url: soundFilePath,
					autoLoad: true,
					volume: 100,
					multiShot: false
				});
			} else {

				debug.warn('NNA.AudioEngine: cacheSound called but audio engine not initialized! Will cache when available.');
				this.delayedCacheSounds.push(function() {

					debug.log('NNA.AudioEngine: delayed caching sound with ID: '+ soundId);
					
					soundManager.createSound({
						id: soundId,
						url: soundFilePath,
						autoLoad: true,
						volume: 100,
						multiShot: false
					});
				});
			}
		},

		playPageBackgroundSoundById: function(soundId) {

			var self = this;

			if(this.audioEngineInitialized) {

				// stop old background sound if present
				if(this.currentPageBackgroundSoundId && this.currentPageBackgroundSoundId != soundId) {

					this.fadeSoundOut(this.currentPageBackgroundSoundId, self.options.fadeOutPercentagePerTick, function() {

						self.currentPageBackgroundSoundId = soundId;

						self.playSoundById(self.currentPageBackgroundSoundId, {volume:self.defaultPageBackgroundVolume, loops: 1000});
					});

				} else {

					this.currentPageBackgroundSoundId = soundId;

					self.playSoundById(self.currentPageBackgroundSoundId, {volume:self.defaultPageBackgroundVolume, loops: 1000});
				}
			} else {

				debug.warn('NNA.AudioEngine: playPageBackgroundSoundById called but audio engine not initialized! storing until audio engine initialized.');

				this.delayedPageBackgroundSoundId = soundId;
			}
		},

		playComponentBackgroundSoundById: function(soundId) {

			var self = this;

			if(this.audioEngineInitialized) {

				// stop old background sound if present
				if(this.currentComponentBackgroundSoundId && this.currentComponentBackgroundSoundId != soundId) {

					this.fadeSoundOut(this.currentComponentBackgroundSoundId, self.options.fadeOutPercentagePerTick, function() {

						self.currentComponentBackgroundSoundId = soundId;

						self.playSoundById(self.currentComponentBackgroundSoundId, {volume:self.defaultComponentBackgroundVolume, loops: 1000});
					});

				} else {

					this.currentComponentBackgroundSoundId = soundId;

					self.playSoundById(self.currentComponentBackgroundSoundId, {volume:self.defaultComponentBackgroundVolume, loops: 1000});
				}
			} else {

				debug.warn('NNA.AudioEngine: playComponentBackgroundSoundById called but audio engine not initialized! storing until audio engine initialized.');

				this.delayedComponentBackgroundSoundId = soundId;
			}
		},

		playVoiceoverSoundById: function(soundId) {

			var self = this;

			if(this.audioEngineInitialized) {

				// ramp down background audio if playing
				if(this.currentPageBackgroundSoundId) {

					this.backgroundSoundFaded = true;
					this.transitionVolume(this.currentPageBackgroundSoundId, (this.options.voiceoverBackgroundVolume > this.defaultPageBackgroundVolume) ? this.defaultPageBackgroundVolume : this.options.voiceoverBackgroundVolume);
				}

				// stop old voiceover sound if present
				if(this.currentVoiceoverSoundId && this.currentVoiceoverSoundId != soundId) {

					this.fadeSoundOut(this.currentVoiceoverSoundId, self.options.fadeOutPercentagePerTick, function() {

						self.playSoundById(soundId, {
							whileplaying: function() {
								
								if(self.currentPageBackgroundSoundId && !self.backgroundSoundFaded) {

									self.backgroundSoundFaded = true;
									self.transitionVolume(self.currentPageBackgroundSoundId, (self.options.voiceoverBackgroundVolume > self.defaultPageBackgroundVolume) ? self.defaultPageBackgroundVolume : self.options.voiceoverBackgroundVolume);
								}
							},
							onfinish: function() {

							self.currentVoiceoverSoundId = null;
							self.backgroundSoundFaded = false;

							self.transitionVolume(self.currentPageBackgroundSoundId, self.defaultPageBackgroundVolume);
							}
						});

						self.currentVoiceoverSoundId = soundId;
					});
				} else {

					this.currentVoiceoverSoundId = soundId;

					self.playSoundById(soundId, {
						whileplaying: function() {

							if(self.currentPageBackgroundSoundId && !self.backgroundSoundFaded) {

								self.backgroundSoundFaded = true;
								self.transitionVolume(self.currentPageBackgroundSoundId, self.options.voiceoverBackgroundVolume);
							}
						},
						onfinish: function() {

							self.currentVoiceoverSoundId = null;
							self.backgroundSoundFaded = false;

							self.transitionVolume(self.currentPageBackgroundSoundId, self.defaultPageBackgroundVolume);
						}
					});
				}
			} else {

				debug.warn('NNA.AudioEngine: playVoiceoverSoundById called but audio engine not initialized! storing until audio engine initialized.');

				this.delayedVoiceoverSoundId = soundId;
			}
		},

		stopPageBackgroundSound: function() {

			var self = this;

			if(this.audioEngineInitialized) {

				if(this.currentPageBackgroundSoundId) {

					this.fadeSoundOut(this.currentPageBackgroundSoundId, this.options.fadeOutPercentagePerTick);

					this.currentPageBackgroundSoundId = null;
					this.backgroundSoundFaded = false;
				} else {

					debug.info('NNA.AudioEngine: no page background sound to stop playing');
				}
			}
		},

		stopComponentBackgroundSound: function() {

			var self = this;

			if(this.audioEngineInitialized) {

				if(this.currentComponentBackgroundSoundId) {

					this.fadeSoundOut(this.currentComponentBackgroundSoundId, this.options.fadeOutPercentagePerTick);

					this.currentComponentBackgroundSoundId = null;
					this.backgroundSoundFaded = false;
				} else {

					debug.info('NNA.AudioEngine: no component background sound to stop playing');
				}
			}
		},

		stopVoiceoverSound: function(soundId) {

			var self = this;

			if(this.audioEngineInitialized) {

				if(this.currentVoiceoverSoundId) {

					this.fadeSoundOut(this.currentVoiceoverSoundId, this.options.fadeOutPercentagePerTick, function() {
						self.transitionVolume(self.currentPageBackgroundSoundId, self.defaultPageBackgroundVolume);
					});

					this.currentVoiceoverSoundId = null;
					this.backgroundSoundFaded = false;
				} else {

					debug.info('NNA.AudioEngine: no voiceover sound to stop playing');
				}
			}
		}

	});
	
})(NNA, jQuery);
