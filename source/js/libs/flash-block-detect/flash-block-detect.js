flashBlockDetect = function(callbackMethod) {
	var return_value = 0;
	if (navigator.plugins["Shockwave Flash"]) {
		if (navigator.userAgent.indexOf('MSIE') > -1) {
			try {
				new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
			} catch (e) {
				return_value = 2;
			}
		} else {
			embed_length = jQuery('embed').length;
			object_length = jQuery('object').length;
			if ((embed_length > 0) || (object_length > 0)) {
				/* Mac / Chrome using FlashBlock + Mac / Safari using AdBlock */
				jQuery('object, embed').each(function() {
					if (jQuery(this).css('display') === 'none') {
						return_value = 2;
					}
				});
			} else {
				/* Mac / Firefox using FlashBlock */
				if (jQuery('div[bginactive]').length > 0) {
					return_value = 2;
				}
			}
		}
	} else if(navigator.userAgent.indexOf('MSIE') > -1) {
		try {
			new ActiveXObject('ShockwaveFlash.ShockwaveFlash');
		} catch (e) {
			return_value = 1;
		}
	} else {
		/* If flash is not installed */
		return_value = 1;
	}
	if (callbackMethod && typeof (callbackMethod) === "function") {
		callbackMethod(return_value);
	} else {
		return return_value;
	}
}; 