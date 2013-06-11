(function(NNA, $){
	
	NNA.Handraiser = Class.extend({
		init: function(){
			
				$.validator.setDefaults({
					errorClass: "form_error",
					errorElement: "div",
					showErrors: function(errorMap, errorList){
						this.currentElements.removeClass("highlighted");
						$(".form_error").first().show();
						$.each(errorList, function(index, error) {
							$(error.element).addClass("highlighted");
						});
						$(".highlighted:first").siblings(".form_error").show();
						
						this.defaultShowErrors();
						this.currentElements.siblings(".form_error").hide();
						$(".highlighted:first").siblings(".form_error").show();
					}
				});

				$('#updates_form').live("submit",function(){
					e.preventDefault();
				});

				$("#updates_form").validate({
					rules: {
						firstName: {
							required: true,
							minlength:2
						},
						lastName: {
							required: true,
							minlength:2
						},
						email: {
							required: true,
							email: true
						},
						zipCode: {
							required: true,
							digits: true,
							minlength:5
						}
					},
					messages: {
						firstName: {
							required: "Your <strong>FIRST NAME</strong><br />is required",
							minlength: $.validator.format("Your <strong>FIRST NAME</strong> must have at least {0} characters")
						},
						lastName: {
							required: "Your <strong>LAST NAME</strong><br />is required",
							minlength: $.validator.format("Your <strong>LAST NAME</strong> must have at least {0} characters")
						},
						email: {
							required: "Your <strong>EMAIL</strong><br />is required",
							email: "Please enter a<br /><strong>VALID EMAIL</strong>"
						},
						zipCode: {
							required: "Your <strong>ZIP CODE</strong><br />is required",
							digits: "<strong>ZIP CODES</strong> are made up of numbers only",	
							minlength: $.validator.format("<strong>ZIP CODES</strong> must have at least {0} digits")
						}
					},
					invalidHandler: function(form, validator){
						
						var error_list = [];
						$.each(validator.invalidElements(), function(index, value) {
							error_list.push($(value).attr("name")); 
						});
						
						if(error_list.length > 0){
							$.publish('/nna/handraiserErrors', [error_list.join(",")]);
						}
					},
					success: function(element){
						element.remove();	
					},
					submitHandler: function(form){
						// When submit is clicked and validation passes
						var brochureData = {
							'leadSourceWebsiteId' : jQuery('#leadsourceid').val(),
							'requestCode1' : jQuery('#vehiclecode').val(),
							'person.firstName' : jQuery('#uf_firstname').val(),
							'person.lastName' : jQuery('#uf_lastname').val(),
							'person.email' : jQuery('#uf_email').val(),
							'address.zipCode' : jQuery('#uf_zipcode').val(),
							'chkPhoneOptin' : false,
							'interestModel' : 'Q50',
							'chkEmailOptin' : (jQuery('#uf_email').val() !== '')? true : false
						};


						function errorHandler(jqXHR, responseCode) {
							
							var validator = $("#updates_form").validate();

							if(responseCode != "success") {
								//jQuery("#formErrors").html("Problem submitting form. Please try again later.");
								validator.showErrors({"submit":"Problem submitting form. Please try again later."});
							} else {
								var errs = [];
								var errors = jqXHR.responseXML.getElementsByTagName("errorMessage");
								for(var i = 0, l = errors.length; i < l; i++) {
									errs.push(errors[i].textContent || errors[i].text);
								}

								//jQuery("#formErrors").html(errs.join("<br/>"));
								validator.showErrors({"submit":errs.join("<br/>")});
							}
							// jQuery("#formErrors").show();
						}
						function completeHandler(jqXHR, responseCode, errorThrown) {
							//console.log("complete",jqXHR)
							if(!jqXHR.hasOwnProperty("responseXML") || jqXHR.responseXML.getElementsByTagName("success").length == 0) {
								errorHandler(jqXHR, responseCode, jqXHR);
							} else {
								//Something
								$("#updates_form, #handraiser_modal .left").hide();
								$("#thank_you").show();
								$.publish('/nna/handraiserComplete');
							}
						}

						$.ajax({
							type : 'POST',
							url : jQuery('#updates_form').attr('action'),
							data : brochureData,
							dataType : 'xml',
							complete : completeHandler,
							error : errorHandler
						});

					}
				});

			debug.log('NNA.Handraiser: initialized');
		}
	});

})(NNA, jQuery);