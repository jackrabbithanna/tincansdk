(function (exports) {

    var
        VideoTracker = require('../../../tracker/modules/tincan_media/video_tracker').VideoTracker,
        VideoQueueTracker = require('../../../tracker/modules/tincan_media/video_queue_tracker').VideoQueueTracker,
        Statement = require('../../../builder/statement').Statement,
        VimeoPlayer = require('../../../../node_modules/@vimeo/player/dist/player'),
        mediaExtensions = require('../../../tracker/modules/tincan_media/media_extensions');

    exports.Watcher = function (id) {
        var _this = this;

        // Track the video statements when the page is closed.
        new VideoQueueTracker(this);

        this.iframe = jQuery('#' + id);
        this.title = "- Private -";

        var match = /vimeo.*\/(\d+)/i.exec(this.iframe.attr('src'));
        this.id = match ? match[1] : false;
        this.url = "https://vimeo.com/" + this.id;
        this.startedTime = null;
        this.parentPage = null;

        this.player = new VimeoPlayer(this.iframe[0]);

        this.createStatement = function (event, start, end) {
            var event2verb = {
                onPlay: "play",
                onPaused: 'paused',
                onSkipped: "skipped",
                onComplete: "complete",
                onWatched: "watched"
            };

            var statement = new Statement,
                verb = event2verb[event],
                stats = {
                    duration: _this.duration,
                    start: start !== undefined ? start : false,
                    end: end !== undefined ? end : false
                };

            statement.setVerb(verb);

            statement.setObject({
                url: _this.url,
                name: _this.title,
                typeId: 'video',
                typePath: 'media'
            });

            if (this.parentPage === null && TC.currentPage) {
                _this.parentPage = TC.currentPage;
            }
            statement.addParent(_this.parentPage);

            statement = mediaExtensions.setMediaContextExtensions(statement, verb, stats);

            return statement;
        };

        this.trackEvent = function (event, start, end) {
            var statement = _this.createStatement(event, start, end);

            statement.submit();

            var verb = statement.verb.id.split(/[\/]+/).pop();
            if (verb === "play")
                _this.startedTime = start;

            if (verb === "paused" && _this.startedTime !== null) {
                _this.trackEvent("onWatched", _this.startedTime, end);
                _this.startedTime = null;
            }
        };

        this.init = function () {
            if (!_this.id)
                return;
            var currentTime = 0;
            _this.player.on('timeupdate', function (data) {
                currentTime = data.seconds * 1000;
            });

            _this.player.getDuration().then( function (duration) {
                _this.duration = duration;

                _this.tracker = new VideoTracker(duration * 1000, {
                    getCurrentTime: function (onDone) {
                        onDone(currentTime);
                    },

                    events: {
                        all: function () {
                            _this.trackEvent.apply(_this, arguments);
                        }
                    }
                });

                if (window.jQuery) {
                    var api = {
                        playVideo: function () {
                            _this.player.play();
                        },
                        pauseVideo: function () {
                            _this.player.pause();
                        }
                    };
                    var video = jQuery('#' + id);
                    video.data('videoTracker', api);
                    video.trigger('videoTrackerInitialized', api);
                }
            });

            _this.player.getVideoTitle().then(function(title) {
                _this.title = title;
            }).catch(function(error) {
                // an error occurred
                console.log(error);
            });
            _this.player.getVideoUrl().then(function(url) {
                _this.url = url;
            }).catch(function(error) {
                // an error occurred
                console.log(error);
            });
        };

        this.init();
    };

})(module.exports);
