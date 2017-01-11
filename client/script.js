
// The SSL and port settings here must match those defined for the backend in /server/config.js
var use_ssl = true;
var port = 3000;

var poll_interval = 5000; // Interval in ms. for refreshing the alarm status.
var backend_protocol = use_ssl ? "https" : "http";
var backend_host = window.location.hostname;
var get_url = backend_protocol + "://"+backend_host + ":" + port + "/alarm";
var put_url_on = backend_protocol + "://"+backend_host + ":" + port + "/alarm/on";
var put_url_off = backend_protocol + "://"+backend_host + ":" + port + "/alarm/off";

var lastArmed = null;

window.onerror = function(error) {
    alert(error);
};

$(document).ready(function() {	
	getStatus();
	showErrorMessage("Ooops", $("#error"), 1500);
    setInterval(getStatus, poll_interval);    
    $('#armed-switch').change(function() {        
        var arm = jQuery("#armed-switch option:selected").val() === 'yes';        
        if (lastArmed != null)            
        {
            if (arm != lastArmed)
            {
                setArmedStatus(arm);
            }
        } 
    });
});

function getStatus(){  
    $.getJSON( get_url, function( data ) {
		lastArmed = data.armed;
        $('#armed-switch').removeAttr("disabled");
        $('#armed-switch').val(data.armed ? "yes" : "no").slider("refresh");    
        $('#last-setter').html("Last "+(data.armed ? "Armed" : "Disarmed")+" "+moment.unix(data.time).fromNow()+" by "+data.user);
    }).error(function(e) { 
		console.log("error "+JSON.stringify(e)); 
	});
}       
   	
function setArmedStatus(arm, response) {
	$.ajax({
		url: arm ? put_url_on : put_url_off,
		type: "PUT",
		success: function(data){
			if (!data.success)
				alert("Could not set alarm. Check doors/detectors.");
		}
	});
}


function showErrorMessage(message, $container, delay) {
    $err = $('<div/>', {
        id: 'error_message'
    });
    $err.attr('data-role', 'popup');
    $err.attr('data-theme', 'e');
    $err.attr('data-overlay-theme', 'a');
    $err.attr('data-position-to', 'window');
    $err.addClass('ui-content');
    $err.text(message);

    $container.children().detach();
    $container.append($err);

    $err.popup( );
    $err.popup( "open" );

    if(delay > 0) {
        setTimeout(function() {
            $err.popup( "close" );
        }, delay);
    }
}