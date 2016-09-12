$(function() {
	client = ZAFClient.init();
	client.invoke('resize', { width: '100%', height: '250px' });

	refresh();

	$('#btn_refresh').click(function() {
		refresh();
	});

	$('#btn_send').click(function() {
		sendMessage(generateMessage());
	});
});

var
	SLACK_URL = 'https://slack.com/api/rtm.start?token=',
	BOT_TOKEN = 'xoxb-75607525509-ayTSoOLWIcuv6V7xcMnCtxFr',

	MSG_TIMEOUT = 5000,

	MSG_SENDING = 'message sending',
	MSG_RECEIVED = 'message received',
	MSG_FAIL = 'message fail',

	client,

	ws = null,

	username = null,
	chat_id = null,

	target = [],

	message_id = 0,
	message_status = null;

function refresh() {
	$.get(SLACK_URL + BOT_TOKEN, function(data, status) {
		if (status === "success"){
			showSlackApp(true);
			updateChatDetail();
			updateTarget(data);
			updateDropdown();
			createSocket(data.url);
		} else {
			showSlackApp(false);
		}
	});
}

function showSlackApp(show) {
	$('#div_slack_app').css('display', show ? 'block' : 'none');
	$('#div_error').css('display', show ? 'none' : 'block');
}

function updateChatDetail() {
	client.get('currentUser.name').then(function (data) {
		username = data['currentUser.name'];
	});

	client.get('chat.id').then(function (data) {
		chat_id = data['chat.id'];
	});
}

function updateTarget(data) {
	var
		users = data.users,
		ims = data.ims,
		users_temp = {};

	for (var i in users) {
		users_temp[users[i].id] = users[i].name;
	}
	for (var i in ims) {
		target[i] = {};
		target[i].ims_id = ims[i].id;
		target[i].name = users_temp[ims[i].user];
	}
}

function updateDropdown() {
	$('#select_dropdown').children().remove();
	for (var i in target) {
		$('#select_dropdown').append($('<option>', {
			value: i,
			text: target[i].name
		}));
	}
}

function createSocket(url) {
	console.log(url);
	ws = new WebSocket(url);
	ws.onmessage = onMessageHandler;
}

function onMessageHandler(event) {
	var data = JSON.parse(event.data);

	if (data.hasOwnProperty('reply_to')) {
		sendMessageCallback(data.reply_to, data.ok);
	}
}

function sendMessageCallback(id, status) {
	if (id === message_id) {
		clearTimeout(id);
		updateMessageStatus(status === true ? MSG_RECEIVED : MSG_FAIL);
	}
}

function sendMessage(message) {
	if (message_status === MSG_SENDING) return;

	updateMessageStatus(MSG_SENDING);

	message_id = setTimeout(function() {
		updateMessageStatus(MSG_FAIL);
	}, MSG_TIMEOUT);

	ws.send(JSON.stringify({
		"id": message_id,
		"type": "message",
		"channel": target[parseInt($('#select_dropdown').val())].ims_id,
		"text": message
	}));
}

function updateMessageStatus(status) {
	message_status = status;
	$("#span_status").text(status);
}

function generateMessage() {
	var msg = '';

	msg += 'Hello, ' + target[parseInt($('#select_dropdown').val())].name + '.\n';
	msg += 'Agent "' + username + '" would like your help on chat "';
	msg += chat_id + '" with the following note:\n';
	msg += $('#textarea_note').val();
	return msg;
}
