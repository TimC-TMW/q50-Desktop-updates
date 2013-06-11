(function(NNA, $) {

	var cookieOptions = {expiryDays:0, path: '/'};
	var placementKey = 'q50_lastClickPlacement';
	var exterior360Key = 'q50_exterior360Interaction';
	var panoInteractionKey = 'q50_interiorInteraction';
	var muteBtnKey = 'q50_muteBtn';
	var deepLink = null;


	// ****************************************************************
	// Store Placement from click events
	$.subscribe('/nna/videofeature/nextChapter', function(){
		// todo: save button click placement: 'next'
		debug.log("CRM Subscribe: nextChapter");
		setCookie(placementKey, 'next');
	});

	$.subscribe('/nna/videofeature/previousChapter', function(){
		// todo: save button click placement: 'previous'
		debug.log("CRM Subscribe: prevChapter");
		setCookie(placementKey, 'previous');
	});

	// gallery
	$.subscribe('/nna/gallery/next', function(){
		debug.log("CRM Subscribe: gallery next");
		setCookie(placementKey, 'next');
	});	
	$.subscribe('/nna/gallery/previous', function(){
		debug.log("CRM Subscribe: gallery previous");
		setCookie(placementKey, 'previous');
	});
	$.subscribe('/nna/gallery/prev_arrow', function(){
		debug.log("CRM Subscribe: gallery prev_arrow");
		setCookie(placementKey, 'prev_arrow');
	});
	$.subscribe('/nna/gallery/next_arrow', function(){
		debug.log("CRM Subscribe: gallery next_arrow");
		setCookie(placementKey, 'next_arrow');
	});	
	$.subscribe('/nna/gallery/thumb_next', function(){
		debug.log("CRM Subscribe: gallery thumb_next");
		setCookie(placementKey, 'thumb_next');
	});
	$.subscribe('/nna/gallery/thumb_previous', function(){
		debug.log("CRM Subscribe: gallery thumb_previous");
		setCookie(placementKey, 'thumb_previous');
	});	
	$.subscribe('/nna/placement/thumb_nail', function(){
		debug.log("CRM Subscribe: gallery thumb_nail");
		setCookie(placementKey, 'thumb_nail');
	});	
	$.subscribe('/nna/placement/continue', function(){
		debug.log("CRM placement continue");
		setCookie(placementKey, 'continue');
	});	
	$.subscribe('/nna/placement/replay', function(){
		debug.log("CRM placement replay");
		setCookie(placementKey, 'replay');
	});	
	$.subscribe('/nna/placement/scrub', function(){
		debug.log("CRM placement scrub");
		setCookie(placementKey, 'scrub');
	});	

	// $.subscribe('/nna/videofeature/restartChapter', function(){
	// 	// todo: save button click placement: 
	// 	debug.log("CRM Subscribe: restartChapter");
	// 	setCookie(placementKey, 'restart'); // There isn't a value for this
	// });

	$.subscribe('/nna/crm/placement/top_nav', function(){
		// todo: save button click placement: 'top_nav'
		debug.log("CRM Subscribe: top_nav");
		setCookie(placementKey, 'top_nav');	
	});	

	$.subscribe('/nna/crm/placement/bottom_nav', function(e,clickEvt){
		// todo: save button click placement: 'bottom_nav'
		debug.log("CRM Subscribe: bottom_nav");
		setCookie(placementKey, 'bottom_nav');

		//var share_class = $(clickEvt.target).attr('class');

		if ($(clickEvt.target).isOf("#footer-share-addthis")) {
			var share_tool = findShareTool($(clickEvt.target).attr("class"));
			// publish event
			$.publish('/nna/crm/share',[share_tool]);
		}

	});	

	$.subscribe('/nna/gallery/share', function(e,clickEvt){
		// todo: save button click placement: 'bottom_nav'
		debug.log("CRM Top Share gallery");
		setCookie(placementKey, 'top_nav');

		//var share_class = $(clickEvt.target).attr('class');

		if ($(clickEvt.target).isOf("#gallery_share")) {
			var share_tool = findShareTool($(clickEvt.target).attr("class"));
			// publish event
			$.publish('/nna/crm/share',[share_tool]);
		}

	});	


	// ****************************************************************
	// CRM Events

	/////////////// page specific events

	// Home page
	$.subscribe('/nna/crm/pageload', function(){
		// todo: save button click placement: 'bottom_nav'
		var lastPlacement = getCookie(placementKey,true);
		debug.log("CRM Subscribe: Page Load", lastPlacement);

		$.publish(NNA.TC.CRM_TRACK_EVENT,[1, {'placement':lastPlacement}]);
		//crmEvent1({'placement':lastPlacement})
	});

	// Design
	// Exterior 360
	$.subscribe('/nna/videofeature/designExterior360Rotate', function(e){
		debug.log("CRM Exterior 360 interaction ");

		$.publish(NNA.TC.CRM_TRACK_EVENT,[10]);		

		$.unsubscribe('/nna/videofeature/designExterior360Rotate');	
	});			


	// Headlights
	$.subscribe('/nna/videofeature/headlightInteraction', function(e,light_num){
		debug.log("CRM headlights interaction", (light_num + 1));

		$.publish(NNA.TC.CRM_TRACK_EVENT,[20, {'num':(light_num + 1)}]);		
	});		
	
	// Pano Interaction
	$.subscribe('/nna/panoramaviewer/mousedown', function(e, panoid, scene){	
		var view = "Interior_front"	
		if(scene>0)
			var view = "Interior_rear"

		debug.log("Pano interaction", view);


		var panoInteraction = getCookie(panoInteractionKey + view,false);

		if(!panoInteraction || panoInteraction === undefined || panoInteraction === ""){
			if($(body).attr('id') == 'page_design')
				$.publish(NNA.TC.CRM_TRACK_EVENT,[16, {'view':view}]);	// design pano	
			if($(body).attr('id') == 'page_gallery')
				$.publish(NNA.TC.CRM_TRACK_EVENT,[11, {'view':view}]);	// gallery pano	

			setCookie(panoInteractionKey + view, "true");
		}
	
	});	

	// Pano Cockpit change
	$.subscribe('/nna/panoramaviewer/loadingScene', function(e, panoid, scene){	
		var view = "Interior_front"
		if(scene>0)
			var view = "Interior_rear"

		debug.log("Pano scene ", view);
		if($(body).attr('id') == 'page_design')
			$.publish(NNA.TC.CRM_TRACK_EVENT,[15, {'view':view}]);	//design pano	
		if($(body).attr('id') == 'page_gallery')
			$.publish(NNA.TC.CRM_TRACK_EVENT,[10, {'view':view}]);	// gallery pano	
	});		


	// Technology
	// Safety Shield
	$.subscribe('/nna/videofeature/safetyShield', function(e, hotspot){
		debug.log("CRM Safety Shield", hotspot);
		$.publish(NNA.TC.CRM_TRACK_EVENT,[15, {'num':hotspot}]);		
	});	

	// Performance
	// Steer By Wire
	$.subscribe('/nna/videofeature/steerByWireSettingChange', function(e, index){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [15, {
			'num': index + 1
		}]);	
	});

	// Gallery

	// gallery 360 exterior interaction
	$.subscribe('/nna/gallery/exterior360Rotate', function(e){
		debug.log("CRM Gallery Exterior 360 interaction ");

		$.publish(NNA.TC.CRM_TRACK_EVENT,[11, {view:'Exterior'}]);		

		$.unsubscribe('/nna/gallery/exterior360Rotate');	
	});		

	// Slide change / loaded
	$.subscribe('/nna/gallery/slideChange', function(e,num){
		var lastPlacement = getCookie(placementKey,true);
		debug.log("Gallery Loaded",num,lastPlacement);
		$.publish(NNA.TC.CRM_TRACK_EVENT,[1, {'num':num,'placement':lastPlacement}]);		
	});	

	$.subscribe('/nna/videofeature/events/chapter', function(e, ch_event, deep_link){
		var lastPlacement = getCookie(placementKey,true);
		debug.warn("CRM Chapter: ", lastPlacement, ch_event.crmid, deep_link,deepLink);

		function pub_ch_evt(){
			$.publish(NNA.TC.CRM_TRACK_EVENT,[1, {'placement':lastPlacement, 'story':ch_event.crmid}]);	
		}

		if(deep_link != null){
			// we want to ignore the chapter event only once if there is a deeplink
			if(deepLink == null){
				deepLink = deep_link;
			}else{
				pub_ch_evt();
			}
		}else{
			pub_ch_evt();
		}

	});			

	$.subscribe('/nna/videofeature/events/endChapter', function(e, ch_event){
		debug.log("CRM End of Chapter: ", ch_event.crmid);
		$.publish(NNA.TC.CRM_TRACK_EVENT,[2, {'story':ch_event.crmid}]);	
	});

	$.subscribe('/nna/videofeature/slowPerformance', function(e, interval){
		$.publish(NNA.TC.CRM_TRACK_EVENT,[5]);
		$.unsubscribe('/nna/videofeature/slowPerformance');	
	});

	$.subscribe('/nna/gallery/threesixty', function(e,view){
		debug.log("CRM Subscribe: gallery threesixty",view);
		$.publish(NNA.TC.CRM_TRACK_EVENT,[10, {'view':view}]);	
	});


	/////////////// Colors
	// page load
	$.subscribe('/nna/colors/load', function(e){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [1]);
	});

	// interior/exterior view change - we dont have interior yet so just track exterior on page load
	$.subscribe('/nna/colors/load', function(e){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [2, { 'view': 'Exterior' }]);
	});

	// user rotates car only needs to fire once so remove event after completion
	$.subscribe('/nna/colors/rotate', function(e){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [3]);
		$.unsubscribe('/nna/colors/rotate');	
	});


	/////////////// Build

	// placement is based on navigation method
	var buildPlacement = getCookie(placementKey,true) || 'load';
	$.subscribe('/nna/build/tabClick', function(e){ buildPlacement = 'tab'; });
	$.subscribe('/nna/build/nextClick', function(e){ buildPlacement = 'next'; });
	$.subscribe('/nna/build/skip', function(e, contentId){
		// placement changes depending on what tab the user was on
		switch(contentId){
			case 'content_engines': buildPlacement = 'reserve_cta_engine'; break;
			case 'content_trims': buildPlacement = 'reserve_cta_trim'; break;
			case 'content_colors': buildPlacement = 'reserve_cta_colors'; break;
			case 'content_packages': buildPlacement = 'reserve_cta_packages'; break;
		}
	});

	// tab or content loads the placement indicates how the user got to the tab
	$.subscribe('/nna/build/pageLoaded', function(e, contentId, currentConfig){
		// the event used changes based on tab that is shown
		var eventId;
		var params = {}
		switch(contentId){
			case 'content_engines':
				eventId = 1;
				params['placement'] = buildPlacement;
				break;
			case 'content_trims':
				eventId = 2;
				params['placement'] = buildPlacement;
				break;
			case 'content_colors':
				eventId = 3;
				params['placement'] = buildPlacement;
				break;
			case 'content_packages':
				eventId = 6;
				params['placement'] = buildPlacement;
				break;
			case 'content_summary':
				// builds a string that indicates users current selections
				var buildDetail = '';
				if(currentConfig['TRIM']) buildDetail += currentConfig['TRIM'].id + '|';
				if(currentConfig['EXTERIOR_COLOR']) buildDetail += currentConfig['EXTERIOR_COLOR'].id + '|';
				for(var i = 0; i < currentConfig['PACKAGES'].length; i++){
					buildDetail += currentConfig['PACKAGES'][i].id;
					if(i !== currentConfig['PACKAGES'].length - 1) buildDetail += ',';
				}
				params['buildDetail'] = buildDetail;

				// normal stuff for tabs
				eventId = 10;
				params['placement'] = buildPlacement;
				break;
		}

		// track tab loaded
		$.publish(NNA.TC.CRM_TRACK_EVENT, [eventId, params]);
	});

	// standard features modal open
	$.subscribe('/nna/build/standardFeatures', function(e){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [4]);	
	});

	// package adding and removal
	$.subscribe('/nna/build/packageToggle', function(e, added, packages){
		// build a string that indicates what packages are selected
		packages = $.map(packages, function(package){ return package.id; });

		// track
		$.publish(NNA.TC.CRM_TRACK_EVENT, [7, {
			'addRemove': added ? 'add' : 'remove',
			'pkgOpt': packages
		}]);	
	});

	// package expansion
	$.subscribe('/nna/build/packageExpand', function(e, name){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [8, { 'detail': name }]);	
	});

	// summary change dealer modal
	$.subscribe('/nna/build/retailerModal', function(e){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [12]);	
	});

	// summary error
	$.subscribe('/nna/build/summaryError', function(e, fieldsWithErrors){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [13, { 'formError': fieldsWithErrors.toString() }]);	
	});

	// summary zip error no dealers found
	$.subscribe('/nna/build/retailersError', function(e, zip){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [11, { 'formError': $('#zipPostalCode').val() }]);	
	});

	// summary thank you page
	$.subscribe('/nna/build/summaryThanks', function(e){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [14]);	
	});

	// modals
	$.subscribe('/nna/build/offerModal', function(e){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [20]);
	});
	$.subscribe('/nna/build/leaseModal', function(e){
		$.publish(NNA.TC.CRM_TRACK_EVENT, [22]);
	});

	/////////////// Specs & Compare
	// Tab select, option selection and filter change
	$.subscribe('/nna/specs/change', function(e, engineType, name){
		var lastPlacement = getCookie(placementKey,true);

		switch(engineType){
			case "standard":
				engine = 'Conventional';
				break;
			case "hybrid":
				engine = 'Hybrid';
				break;
			default:
				engine = 'All';
				break;
		}

		debug.log("Change to Spec page", engineType, name, lastPlacement);
		$.publish(NNA.TC.CRM_TRACK_EVENT,[2, {'engine':engine,'placement':lastPlacement,'name':name}]);
	});	

	// PDF download
	$.subscribe('/nna/specs/downloadPDF', function(){
		var lastPlacement = getCookie(placementKey,true);

		debug.log("PDF downloaded",lastPlacement);
		$.publish(NNA.TC.CRM_TRACK_EVENT,[3, {'placement':lastPlacement}]);
	});	

	/////////////// More global events
	// Live Chat
	$.subscribe('/nna/liveChatOpen', function(){
		$.publish(NNA.TC.CRM_TRACK_EVENT,[60]);	
	});

	// Share tool
	$.subscribe('/nna/crm/share', function(e, share_tool){
		var lastPlacement = getCookie(placementKey,true);
		if(share_tool){
			debug.log("CRM Share: ", lastPlacement, share_tool);
			$.publish(NNA.TC.CRM_TRACK_EVENT,[30, {'placement':lastPlacement, 'tool':share_tool}]);	
		}
	});		

	// Modals
	$.subscribe('/nna/openModal', function(e, modalTemplate){
		var lastPlacement = getCookie(placementKey,true);
		var modal_name = $(modalTemplate).attr("data-ms-name");
		debug.log("CRM Modal ", modal_name,lastPlacement);

		switch(modal_name){
			case "modal-handraiser": // handraiser modal
				$.publish(NNA.TC.CRM_TRACK_EVENT,[40, {'placement':lastPlacement}]);
				break;
			case "modal-allfeatures": // all features modal
				$.publish(NNA.TC.CRM_TRACK_EVENT,[50, {'placement':lastPlacement}]);
				break;
			case "modal-standard-equipment": // build standard equipment modal
				$.publish(NNA.TC.CRM_TRACK_EVENT,[4, {'placement':lastPlacement}]);
				break;
		}
	});

	// Handraiser errors
	$.subscribe('/nna/handraiserErrors', function(e, formError){
		if(formError){
			debug.log("Handraiser Error: ",  formError);
			$.publish(NNA.TC.CRM_TRACK_EVENT,[41, {'formError':formError}]);	
		}
	});		

	// Handraiser errors
	$.subscribe('/nna/handraiserComplete', function(){
		debug.log("Handraiser Complete");
		$.publish(NNA.TC.CRM_TRACK_EVENT,[42]);	
	});	

	// Mute button - "Must Button" - not sure if they only want when sound is Muted, or when the toggle is clicked
	// if they want only mute, use the event: '/nna/audioEngine/mute'
	$.subscribe('/nna/toggleAudio', function(){
		var muteBtn = getCookie(muteBtnKey,false);
		debug.log("CRM Mute toggle button click");
		if(!muteBtn || muteBtn === undefined || muteBtn === ""){
			setCookie(muteBtnKey, "true");
			$.publish(NNA.TC.CRM_TRACK_EVENT,[70]);	
		}		
	});


	// ****************************************************************
	// Helper functions

	function setCookie(key,val){
		NNA.Utils.setCookie(key,val,cookieOptions);
	}

	function getCookie(key,remove){
		var val = NNA.Utils.getCookie(key);
		if(remove){
			NNA.Utils.setCookie(key,'',cookieOptions); //erase it for next click	
		}
		
		return val;
	}

	// match the type of share tool clicked based on its "share this" class name
	function findShareTool(share_class){
		var share_tool = null;
		// check for Share click
		switch (true) {
			case /email/.test(share_class):
				share_tool = "email";
				break;
			case /facebook/.test(share_class):
				share_tool = "facebook";
				break;
			case /google/.test(share_class):
				share_tool = "google+";
				break;			
			case /twitter/.test(share_class):
				share_tool = "twitter";
				break;
		}

		return share_tool;
	}

	// is child of
	$.fn.isOf = function( selector ){
		if( $(this).is(selector) || $(this).parents(selector).size() > 0 ){
			return true;
		}
		return false;
	};
	
})(NNA, jQuery);
