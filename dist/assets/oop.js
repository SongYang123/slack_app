$(function() {
	client = ZAFClient.init();
	client.invoke('resize', { width: '100%', height: '250px' });

	zopim = new Zopim(client);
	slack = new Slack(BOT_TOKEN);

	slack.setRefreshCallback(refreshCallback);
	slack.setMessageCallback(updateMessageStatus);

	slack.refresh();

	$('#btn_refresh').click(function() {
		slack.refresh();
	});

	$('#btn_send').click(function() {
		slack.sendMessage(
			slack.getTarget()[parseInt($('#select_dropdown').val())].ims_id,
			generateMessage(zopim.getUsername(), zopim.getChatId(), slack.getTarget()[parseInt($('#select_dropdown').val())].name)
		);
	});
});

var
		BOT_TOKEN = 'xoxb-75607525509-ayTSoOLWIcuv6V7xcMnCtxFr',

		client = null,
		zopim = null,
		slack = null;

function Slack(robot_token) {
	var
		SLACK_URL = 'https://slack.com/api/rtm.start?token=',

		MSG_TIMEOUT = 5000,

		MSG_SENDING = 'message sending',
		MSG_RECEIVED = 'message received',
		MSG_FAIL = 'message fail',

		refresh_callback = null,
		message_callback = null,

		show = false,
		target = null,

		ws = null,

		message_id = 0,
		message_status = null;

	this.setRefreshCallback = function(callback) {
		refresh_callback = callback;
	};

	this.setMessageCallback = function(callback) {
		message_callback = callback;
	};

	this.refresh = function() {
		$.get(SLACK_URL + robot_token, function(data, status) {
			if (status === "success"){
				show = true;
				updateTarget(data);
				createSocket(data.url);
				refresh_callback();
			} else {
				show = false;
				target = null;
			}
		});
	};

	this.getShow = function() {
		return show;
	};

	this.getTarget = function() {
		return target;
	};

	this.getMessageStatus = function() {
		return message_status;
	}

	this.sendMessage = function(channel, message) {
		if (message_status === MSG_SENDING) return;

		message_status = MSG_SENDING;
		message_callback();

		message_id = setTimeout(function() {
			message_status = MSG_SENDING;
			message_callback();
		}, MSG_TIMEOUT);

		ws.send(JSON.stringify({
			"id": message_id,
			"type": "message",
			"channel": channel,
			"text": message
		}));
	};

	function updateTarget(data) {
		var
			users = data.users,
			ims = data.ims,
			users_temp = {};

		target = [];
		for (var i in users) {
			users_temp[users[i].id] = users[i].name;
		}
		for (var i in ims) {
			target[i] = {};
			target[i].ims_id = ims[i].id;
			target[i].name = users_temp[ims[i].user];
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
			message_status = status === true ? MSG_RECEIVED : MSG_FAIL;
			message_callback();
		}
	}
}

function Zopim(client) {
	var
		username = null,
		chat_id = null;

	client.get('currentUser.name').then(function (data) {
		username = data['currentUser.name'];
	});

	client.get('chat.id').then(function (data) {
		chat_id = data['chat.id'];
	});

	this.getUsername = function() {
		return username;
	};

	this.getChatId = function() {
		return chat_id;
	};
}

function refreshCallback() {
	showSlackApp(slack.getShow());
	updateDropdown(slack.getTarget());
}

function updateMessageStatus() {
	$("#span_status").text(slack.getMessageStatus());
}

function showSlackApp(show) {
	$('#div_slack_app').css('display', show ? 'block' : 'none');
	$('#div_error').css('display', show ? 'none' : 'block');
}

function updateDropdown(target) {
	$('#select_dropdown').children().remove();

	if (target === null) return;

	for (var i in target) {
		$('#select_dropdown').append($('<option>', {
			value: i,
			text: target[i].name
		}));
	}
}

function generateMessage(username, chat_id, target_name) {
	var msg = '';

	msg += 'Hello, ' + target_name + '.\n';
	msg += 'Agent "' + username + '" would like your help on chat "';
	msg += chat_id + '" with the following note:\n';
	msg += $('#textarea_note').val();
	return msg;
}
