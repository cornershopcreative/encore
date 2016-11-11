//console.profile("Processing page");
//console.time("Page loading");

;(function (window) {
  var transitions = {
      'transition': 'transitionend',
      'WebkitTransition': 'webkitTransitionEnd',
      'MozTransition': 'transitionend',
      'OTransition': 'otransitionend'
    },
    elem = document.createElement('div');

  for(var t in transitions){
    if(typeof elem.style[t] !== 'undefined'){
      window.transitionEnd = transitions[t];
      break;
    }
  }
  if (!window.transitionEnd) window.transitionEnd = false;
})(window);

jQuery.fn.textWidth = function(_text, _font){//get width of text with font.  usage: $("div").textWidth();
  var fakeEl = jQuery('<span>').hide().appendTo(document.body).text(_text || this.val() || this.text()).css('font', _font || this.css('font')),
      width = fakeEl.width();
  fakeEl.remove();
  return width;
};

jQuery.fn.autoresize = function(options){//resizes elements based on content size.  usage: $('input').autoresize({padding:10,minWidth:0,maxWidth:100});
  options = jQuery.extend({padding:10,minWidth:0,maxWidth:10000}, options||{});
  var $t = jQuery(this);
  $t.on('input', function() {
    $t.css('width', Math.min(options.maxWidth,Math.max(options.minWidth,$t.textWidth() + options.padding)));
  }).trigger('input');
  return this;
}

var FlowFlowApp = (function($){
  var $ = jQuery;

  // streams model, view and collection declaring
  var StreamModel;
  var StreamModelsCollection;
  var StreamView;

  // rows model, view and collection declaring
  var StreamRowModel;
  var StreamRowModelsCollection;
  var StreamRowView;

  // instances declaring
  var Streams;
  var streamRowModels;
  var streamModels;

  // Feeds MVC
  var FeedsModel;
  var FeedsView;
  var feedsModel, feedsView;

  var templates = window.ff_templates;

  var sessionStorage = window.sessionStorage || {getItem: function(){return false}, setItem: function(){}};

  var transitionEnd = window.transitionEnd;

  var alphabet = 'abcdefghijklmnopqrstuvwxyz';

  var ua = navigator.userAgent.toLowerCase();
  var isWebkit = /safari|chrome/.test(ua);
  var isMobile = /android|blackBerry|iphone|ipad|ipod|opera mini|iemobile/i.test(ua);
  var isIE = /msie|trident.*rv\:11\./.test(ua);
  var isFF = /firefox/.test(ua);

  var processed = false;

  var Controller = {
    savedView : sessionStorage.getItem('ff_stream') || 'list',
    $body: null,
    $container : null,
    $sources : null,
    $list : null,
    $streamsList : null,
    $errorPopup : $('<div id="error-popup"></div>'),
    $html : null,
    $content : null,
    $tabList : null,
    $tabs: null,
    $overlay : null,
    $previewStyles : null,
    $form: null,
    editor: null,
    clip: null,
    activeTabIndex: parseInt(sessionStorage.getItem('as_active_tab') || 0),

    makeOverlayTo: function (op, classN) {
      this.$html.removeClass('popup_visible');
      this.resetScrollbar();
      this.$overlay[( op === 'show' ? 'add' : 'remove' ) + 'Class'](classN || 'loading');
    },
    init: function () {
      this.$body = $('body');
      this.$container = $('#streams-cont');
      this.$sources = $('#sources-list');
      this.$list = this.$container.find('#streams-list tbody');
      this.$streamsList = $('#streams-list-section');
      this.$html = $('html');
      this.$form = $('#flow_flow_form');
      this.$overlay = $('#fade-overlay');
      this.$content = $('.section-contents');
      this.$tabList = $('.section-tabs');
      this.$tabs = this.$tabList.find('li');

      // execute immediatelly
      this.$html.addClass('ff-browser-' + (isWebkit ? 'webkit' : isIE ? 'ie' : isFF ? 'ff' : '') + (window.WP_FF_admin ? ' ff-wp' : ' ff-standalone') + (window.isCompact ? ' ff-compact-admin' : ''));

      this.setupModelsAndViews();
      this.setupTabsAndContainer();
      this.attachGlobalEvents();
      Controller.confirmPopup = this.initConfirmPopup();
      this.initClipBoard();

    },

    initClipBoard: function () {

      // init copying to clipboard
      this.clip = new ZeroClipboard( $('.shortcode-copy') );

      this.clip.on( "copy", function (event) {
        var $t = $(event.target);
        var clipboard = event.clipboardData;
        var text = $(event.target).parent().find('.shortcode').text();

        if (text) {
          $t.addClass('copied').html('Copied');
          clipboard.setData( "text/plain", text );
          setTimeout(function(){$t.removeClass('copied').html('Copy');}, 3000)
        } else {
          $t.addClass('copy-failed');
        }

      });

      this.$list.on('mouseleave', '.shortcode-copy', function(){
        $(this).removeClass('zeroclipboard-is-hover');
      });
    },

    createBackup: function (e) {

      var data = {
        'action': 'create_backup'
      };

      Controller.makeOverlayTo('show');

      $.post(_ajaxurl, data).done(function(){
        location.reload();
      })

    },

    restoreBackup: function (e) {
      var promise = Controller.confirmPopup('Are you sure?');
      var self = this;
      promise.then(function success(){
        var data = {
          action: 'restore_backup',
          id: $(self).closest('tr').attr('backup-id')
        }
        Controller.makeOverlayTo('show');

        $.post(_ajaxurl, data).done(function(data){
          sessionStorage.setItem('as_view_mode', 'list');
          sessionStorage.setItem('as_active_tab', 0);
          location.reload();
        })
      }, function fail () {})
    },

    deleteBackup: function () {
      var promise = Controller.confirmPopup('Are you sure?');
      var self = this;

      promise.then(function success(){
        var data = {
          action: 'delete_backup',
          id: $(self).closest('tr').attr('backup-id')
        }
        Controller.makeOverlayTo('show');

        $.post(_ajaxurl, data).done(function(){
          location.reload();
        })
      }, function fail () {})
    },

    initConfirmPopup: function () {
      // Alert popup

      var $popup = $('.cd-popup');
      //open popup
      Controller.$form.on('click', '.cd-popup-trigger', function(event){
        event.preventDefault();
        $popup.addClass('is-visible');
        $(document).on('keyup', escClose);
      });

      $popup.find('#cd-button-yes').on('click', function(e){
        e.preventDefault();
        $popup.data('defer') && $popup.data('defer').resolve();
        $popup.removeClass('is-visible');

      })
      $popup.find('#cd-button-no, .cd-popup-close').on('click', function(e){
        e.preventDefault();
        $popup.data('defer') && $popup.data('defer').reject();
        $popup.removeClass('is-visible');

      })

      //close popup
      $popup.on('click', function(event){
        if( $(event.target).is('.cd-popup-close') || $(event.target).is('.cd-popup') ) {
          event.preventDefault();
          $(this).removeClass('is-visible');
          $(document).off('keyup', escClose);
        }
      });

      function escClose(event) {
        if(event.which=='27'){
          $popup.data('defer') && $popup.data('defer').reject();
          $popup.removeClass('is-visible');
        }
      }

      function confirm (text, neutral) {
        var defer = $.Deferred();

        if ( !neutral ) $popup.removeClass('is-neutral');
        $popup.data('defer', defer);
        $popup.find('p').html(text || 'Are you sure?');
        $popup.addClass('is-visible' + (neutral ? ' is-neutral' : ''));

        $(document).on('keyup', escClose);
        return defer.promise();
      }
      //close popup when clicking the esc keyboard button
      $(document).keyup(function(event){
        if(event.which=='27'){
          $popup.removeClass('is-visible');
        }
      });

      return confirm;
    },

    setupModelsAndViews : function () {

      var self = this;
      var savedScrollState = sessionStorage.getItem('as_scroll');
      var $htmlAndBody = $('html, body');

      for (var i = 0, len = window.streams.length; i < len; i++) {
        streamRowModels.add(window.streams[i]);
      }

      $('#streams-list tbody tr').not('.empty-row').each(function(){
        var $t = $(this);
        var view = new StreamRowView({model: streamRowModels.get($t.attr('data-stream-id')), el: this});
      });

      if ( this.savedView !== 'list' && streamRowModels.get(this.savedView) ) {
        this.makeOverlayTo('show');
        streamRowModels.get(this.savedView).view.edit().then(function(){

          if (savedScrollState) {
            $htmlAndBody.scrollTop(savedScrollState);
          }

          self.makeOverlayTo('hide');

          setTimeout(function(){

            self.$container.addClass('transition--enabled');

            if (savedScrollState) {
              $htmlAndBody.scrollTop(savedScrollState);
            }

          }, 800);
        });
      } else  {
        this.savedView = 'list';
        this.switchToView('list');
        this.makeOverlayTo('hide');
        if (savedScrollState) {
          $htmlAndBody.scrollTop(savedScrollState);
        }
        setTimeout(function(){
          self.$container.addClass('transition--enabled');
          if (savedScrollState) {
            $htmlAndBody.scrollTop(savedScrollState);
          }
        }, 800);
      }


      // feeds tab

      feedsModel = new FeedsModel({feeds: window.feeds});
      feedsView = new FeedsView({model: feedsModel, el: self.$form.find('#sources-list')[0]});
    },
    
    tabs: (function () {
      var $cont;
      var $tabs;
      var $sections;
      var $cursor;
      var id;
      var moveCursor;

      function init ($el, id) {
        this.$el = $el;
        this.id = id;
        this.$tabs = this.$el.find('.view-tabs');
        this.$cursor = this.$tabs.find('.tab-cursor');
        this.$sections = this.$el.find('.section[data-tab]');
        moveCursor = moveCursor.bind(this);
        //console.log('activating tabs', this);
        setupActive.call(this);
        attachEvents.call(this);
      }
      
      function setupActive () {
        var $active = this.$tabs.find('li:not(".tab-cursor")').first();
        this.$tabs.find('li:not(".tab-cursor")').first().addClass('section-active-tab');
        this.$sections.first().addClass('active-section');
        Controller.setHeight(this.id);
        setTimeout(function(){
          moveCursor($active);
        },0)
      }
      
      function attachEvents () {
        var self = this;

        this.$tabs.find('li').click(function () {
          var val = this.innerHTML;
          var $active = $(this);
          self.$tabs.find('.section-active-tab').removeClass('section-active-tab');
          $active.addClass('section-active-tab');
          self.$sections.removeClass('active-section').filter('[data-tab="' + val + '"]').addClass('active-section')
          Controller.setHeight(self.id);
          moveCursor($active);
        });
      }

      function moveCursor ($active) {
        var w = $active.outerWidth();
        var pos = $active.position();
        this.$cursor.css({'left' : pos.left + 'px', minWidth: w + 'px'})
      }
      
      return {
        init: init
      }
    })(),
    
    attachGlobalEvents : function () {

      var self = this;

      var $backupsForm = this.$form.find('#backup-settings');

      this.$container.find('.button-add').on('click', function(){
        var model, view;

        if (!self.$container.find('#stream-view-new').length) {
          model = new StreamModel();
          view = new StreamView({model: model});
          streamModels.add(model);
          self.$container.append(view.$el);
          view.saveViaAjax();
        }

        setTimeout(function(){self.switchToView('new')},100);
      });

      this.$form.find('#streams-tab').on('click', function () {
        if (self.$form.is('.stream-view-visible') && self.activeTabIndex === 0) {
          self.switchToView('list');
        }
      });

      self.$tabs.on( 'click' , function() {
        var index = self.$tabs.index( this );
        var $t = $( this );

        if ($t.is('#suggestions-tab')) {
          /*
           window.open('http://goo.gl/forms/HAJ95k8kAI');
           */
          self.insertFeedbackForm();
        }

        self.$tabList.add( self.$content ).find( '.active' ).removeClass( 'active' );
        $t.add( self.$content.find( '.section-content:eq(' + index + ')' ) ).addClass( 'active' );

        if (index !== 0) {
          self.$form.removeClass('stream-view-visible');
        } else {
          if (self.$form.find('#streams-cont [data-view-mode="streams-update"].view-visible').length) {
            self.$form.addClass('stream-view-visible');
          }
        }

        self.activeTabIndex = index;
        sessionStorage.setItem('as_active_tab', index);

        return false;
      });

      $backupsForm.on('click', '.create_backup', this.createBackup);
      $backupsForm.on('click', '.restore_backup', this.restoreBackup);
      $backupsForm.on('click', '.delete_backup', this.deleteBackup);

      this.$form.delegate('.admin-button.submit-button', 'click', function (e) {
        var $t = $(this);
        var $contentInput;
        var $cont;
        var $licenseCont;
        var invalid, promise;
        var opts = {
          doReload: false,
          doSubscribe: false
        }

        // validate activation form
        if ($t.is('#user-settings-sbmt')) {
          $licenseCont = $('#envato_license');

          if ($licenseCont.is('.plugin-activated')) {
            promise = self.confirmPopup('Are you sure?');
            promise.then(function success(){
              $licenseCont.find('input').val('');
              $licenseCont.find(':checkbox').attr('checked', false);
              opts.doReload = true;
              submitForm(opts);
            }, function(){
              // do nothing
            });
            return;
          } else {
            // validation
            if (!self.validateEmail($licenseCont.find('#company_email').val())) {
              $licenseCont.find('#company_email').addClass('validation-error');
              invalid = true;
            }

            if (!self.validateCode($licenseCont.find('#purchase_code').val())) {
              $licenseCont.find('#purchase_code').addClass('validation-error');
              invalid = true;
            }

            if (invalid) {
              return;
            } else {
              opts.attemptToActivate = true;
              opts.doReload = true;
            }
          }
        }

        if ($t.is('#user-settings-sbmt-2')) {
          $('#news_subscription').attr('checked', true);
          opts.doReload = true;
          opts.doSubscribe = true;
        }

        submitForm(opts);

        function submitForm(opts) {
          $t.addClass('button-in-progress');
          self.makeOverlayTo('show');
          $t.closest('form').trigger('submit', opts);
          sessionStorage.setItem('section-submit', $t.attr('id'));
        }
      });

      this.$form.on('click', 'a[href*="#"]', function (e) {
        if (this.hash) {
          self.$form.find(this.hash).click()
        }
        return false
      })

      this.$form.on('submit', function(e, opts){
        //			console.time('submit')
        e.preventDefault();

        var serialized, data;
        var $inputs = self.$form.find('.section-content').not('#streams-cont, #campaigns-cont, #sources-cont').find(':input');
        //Serialize form as array
        serialized = $inputs.serializeArray();
        //trim values
        for(var i =0, len = serialized.length;i<len;i++){
          serialized[i]['value'] = $.trim(serialized[i]['value']);
        }

        //turn it into a string if you wish
        serialized = $.param(serialized);

        $inputs.filter('input[type=checkbox]:not(:checked)').each(
            function () {
              if (name != 'mod-roles') {
                serialized += '&' + encodeURIComponent(this.name) + '=nope';
              }
            })

        data = {
          action: la_plugin_slug_down + '_ff_save_settings',
          settings: serialized,
          doSubcribe: opts.doSubscribe
        };

        $.post(_ajaxurl, data, function( response ) {
          console.log('Got this from the server: ' , response )
          var $fb_token, $submitted;
          if( response == -1 ){

          }
          else{
            // Do something on success
            console.log(response.settings)
            if (typeof response === 'string' && response.indexOf('curl')) {
              alert('Please set DISABLE CURL_FOLLOW_LOCATION setting to YES under General tab');
              self.makeOverlayTo('hide');
              return;
            }

            if (opts.attemptToActivate && response.activated !== true) {
              alert(response.activated);
              self.makeOverlayTo('hide');
              return;
            }

            $fb_token = $('input[name="flow_flow_fb_auth_options[facebook_access_token]"]').parent();
            if (response.fb_extended_token == false){
              $fb_token.find('.desc').remove();
              $fb_token.find('textarea').remove();
              $fb_token.append('<p class="desc fb-token-notice" style="margin: 10px 0 5px; color: red !important">! Extended token is not generated, Facebook feeds might not work</p>');
              $fb_token.removeClass('fb-empty');
            }
            else if (response.settings.flow_flow_fb_auth_options.facebook_access_token == response.fb_extended_token){

            }
            else {
              if (response.settings && response.settings.flow_flow_fb_auth_options && response.settings.flow_flow_fb_auth_options.facebook_access_token == '') {
                $fb_token.addClass('fb-empty');
              } else {
                if (response.fb_extended_token && !$fb_token.find('textarea').length) {
                  $fb_token.find('.desc').remove();
                  $fb_token.append('<p class="desc" style="margin: 10px 0 5px">Generated long-life token, it should be different from that you entered above then FB auth is OK</p><textarea disabled rows=3>'  + response.fb_extended_token + '</textarea>');
                }
                $fb_token.removeClass('fb-empty');
              }
            }

            if (!opts.doReload) self.makeOverlayTo('hide');

            $submitted = $('#' + sessionStorage.getItem('section-submit'));
            $submitted.addClass('updated-button').html('&#10004;&nbsp;&nbsp;Updated');
            $submitted.removeClass('button-in-progress');

            setTimeout( function () {
              $submitted.html('Save changes').removeClass('updated-button');
            }, 2500);
          }

          if (opts.doReload) location.reload();

        }, 'json' ).fail( function( d ){
          console.log( d.responseText );
          console.log( d );
          alert('Error occured. If you see this after adding FB auth then double-check your data.')
        });

        return false
      });

      this.$form.delegate('input', 'keydown', function (e){
        var $t = $(this)
        if ($t.is('.validation-error')) {
          $t.removeClass('validation-error');
        }
        if (e.which == 13) {
          //console.log('enter')
        }
      });

      this.$form.find('#facebook_use_own_app').change(function(){
        var $t = $(this);
        var $p = $t.closest('dl');
        var checked = this.checked;

        $p.find('dd, dt').not('.ff-toggler').find('input')[ checked ? 'removeClass' : 'addClass' ]('disabled')
        $p[ checked ? 'addClass' : 'removeClass' ]('ff-own-app');
        $('#facebook-auth')[this.checked ? 'hide' : 'show']();

      }).change();

      this.$form.find('.extension__cta--disabled').click(function(e){
        e.preventDefault();
      });

      $(window).unload(function (e) {
        sessionStorage.setItem('as_scroll', $('body').scrollTop() || $('html').scrollTop());
      });

      this.$errorPopup.on('mouseleave', function(e){
        self.$errorPopup.removeClass('visible')
      })

      this.initFacebookAuth();
      this.initFoursquareAuth();
      this.initInstagramAuth();
    },

    backUrl: _ajaxurl + '?action=flow_flow_social_auth',

    initFacebookAuth: function () {
      //https://www.facebook.com/dialog/oauth

      var f = "http://flow.looks-awesome.com/service/auth/facebook2.php?" + $.param({
            back: this.backUrl
          });
      $("#facebook-auth").click(function(){
        var $t = $(this);
        if ($(this).html() === 'Log Out') {
          $('#facebook_access_token').val('');
          $('#fb-auth-settings-sbmt').click();
          $("#facebook-auth").html('Authorize');
          return
        }
        document.location.href = f;
        //alert(h);
      });

      if ($('#facebook_access_token').val() !== '') {
        $("#facebook-auth").html('Log Out')
      }
    },

    initFoursquareAuth: function () {

      var j = "https://foursquare.com/oauth2/authenticate?" + $.param({
            client_id: "22XC2KJFR2SFU4BNF4PP1HMTV3JUBSEEVTQZCSCXXIERVKA3",
            redirect_uri: "http://flow.looks-awesome.com/service/auth/foursquare.php?back=" + this.backUrl,
            response_type: "code"
          });

      $("#foursquare-auth").click(function(){
        var $t = $(this);
        if ($(this).html() === 'Log Out') {
          $('#foursquare_access_token').val('');
          $('#fq-auth-settings-sbmt').click();
          $("#foursquare-auth").html('Authorize');
          return
        }
        document.location.href = j;
      });

      if ($('#foursquare_access_token').val() !== '') {
        $("#foursquare-auth").html('Log Out')
      }

      if ($('#foursquare_client_id').val() === '') {
        var $par = $('#foursquare_client_id').parent();
        $par.add($par.prev('dt').first()).hide();
      }
      if ($('#foursquare_client_secret').val() === '') {
        var $par = $('#foursquare_client_secret').parent();
        $par.add($par.prev('dt').first()).hide();
      }
    },

    initInstagramAuth: function () {

      //http://stackoverflow.com/questions/7131909/facebook-callback-appends-to-return-url/7297873#7297873
      if (window.location.hash && window.location.hash == '#_=_') {
        window.location.hash = '';
      }

      var h = "https://api.instagram.com/oauth/authorize/?" + $.param({
            client_id: "94072d7b728f47b68bc7fc86767b3ebe",
            redirect_uri: "http://social-streams.com/services/auth/instagram.php?back=" + this.backUrl,
            response_type: "code",
            scope: "basic public_content"
          });

      $("#inst-auth").click(function(){
        var $t = $(this);
        if ($(this).html() === 'Log Out') {
          $('#instagram_access_token').val('');
          $('#inst-auth-settings-sbmt').click();
          $("#inst-auth").html('Authorize');
          return
        }
        document.location.href = h;
        //alert(h);
      });

      if ($('#instagram_access_token').val() !== '') {
        $("#inst-auth").html('Log Out');
      }
    },

    checkScrollbar : function () {
      debugger
      this.bodyIsOverflowing = document.body.scrollHeight > document.documentElement.clientHeight
      this.scrollbarWidth = this.measureScrollbar()
    },

    setScrollbar : function () {
      var bodyPad = parseInt((this.$body.css('padding-right') || 0), 10)
      if (this.bodyIsOverflowing) this.$body.css('padding-right', bodyPad + this.scrollbarWidth)
    },

    resetScrollbar : function () {
      this.$body.css('padding-right', '')
    },

    measureScrollbar : function () { // thx walsh
      var scrollDiv = document.createElement('div')
      scrollDiv.className = 'ff-modal-scrollbar-measure'
      this.$body.append(scrollDiv)
      var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth
      this.$body[0].removeChild(scrollDiv);
      return scrollbarWidth
    },

    switchToView : function (view) {

      var self = this;
      this.$container.find('.view-visible').removeClass('view-visible');
      this.setHeight(view);
      setTimeout(function(){
        if (view === 'list') {
          self.$container.find('#streams-' + view).addClass('view-visible');
          self.$form.removeClass('stream-view-visible');
        } else {
          self.$container.find('#stream-view-' + view).addClass('view-visible');
          self.$form.addClass('stream-view-visible');
        }
      },0)

      sessionStorage.setItem('ff_stream', view);
    },

    setHeight : function (id) {
      var self = this;

      var heights = [];
      var maxH;
      //
      if (id && !isNaN(parseInt(id))) {
        self.$container.find('#stream-view-' + id + ', #streams-list').each(function(){
          heights.push($(this).outerHeight());
        });
      } else {
        self.$container.find('.section-stream[data-view-mode="streams-update"], #streams-list').each(function(){
          heights.push($(this).outerHeight());
        });
      }

      maxH = Math.max.apply(Math, heights);
      self.$container.css('minHeight', maxH);
    },

    setupTabsAndContainer: function () {
      var self = this;
      var $activeTab;

      $activeTab = $('.section-tabs li:eq(' + this.activeTabIndex +')');

      $activeTab.add('.section-content:eq(' + this.activeTabIndex + ')').addClass('active');
      if ($activeTab.is('#suggestions-tab')) this.insertFeedbackForm();

      // moderation

      setTimeout(function () {
        if (!$('[name="mod-roles"]:checked').length) {
          $('#mod-role-administrator').attr('checked', true);
        }
      },0)


      if ( this.activeTabIndex !== 0 ) {
        this.makeOverlayTo('hide');
      }

      $('body').append(this.$errorPopup)
               .append('<div class="content-popup"><div class="content-popup__container"><div class="content-popup__content"></div><div class="content-popup__close"></div></div></div>');

      this.$html.addClass('page-loaded');
      $('.wrapper').css('opacity', 1);
    },

    insertFeedbackForm: function insertFeedbackForm() {
      if (!insertFeedbackForm.inserted) {

        $('#feedback').append('<iframe src="https://docs.google.com/forms/d/1yB8YrR4FTU8UeQ9oEWN11hX8Xh-5YCO5xv6trFPVUlg/viewform?embedded=true" width="760" height="500" frameborder="0" marginheight="0" marginwidth="0">Loading...</iframe>');

        insertFeedbackForm.inserted = true;
      }
    },

    randomString: function (length, chars) {
      var result = '';
      for (var i = length; i > 0; --i) result += chars[Math.round(Math.random() * (chars.length - 1))];
      return result;
    },

    getRandomId: function () {
      return this.randomString(1, alphabet) + this.randomString(1, alphabet) + new Date().getTime().toString().substr(8);
    },

    addCSSRule: function (sheet, selector, rules) {
      //Backward searching of the selector matching cssRules
      if (sheet && sheet.cssRules) {
        var index=sheet.cssRules.length-1;
        for(var i=index; i>0; i--){
          var current_style = sheet.cssRules[i];
          if(current_style.selectorText === selector){
            //Append the new rules to the current content of the cssRule;
            rules=current_style.style.cssText + rules;
            sheet.deleteRule(i);
            index=i;
          }
        }
        if(sheet.insertRule){
          sheet.insertRule(selector + "{" + rules + "}", index);
        }
        else{
          sheet.addRule(selector, rules, index);
        }
        return sheet.cssRules[index].cssText;
      }
    },

    validateEmail: function (val) {
      return /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,8}$/.test(val);
    },

    validateCode: function (val) {
      return /^[a-z0-9]+\-[a-z0-9]+\-[a-z0-9]+\-[a-z0-9]+\-[a-z0-9]+$/.test(val);
    }
  }

  StreamModel = Backbone.Model.extend({
    defaults: function () {
      return {
        "name":                  "",
        "moderation":            "nope",
        "order":                 "smartCompare",
        "posts":                 "30",
        "days":                  "",
        "page-posts":            "15",
        "cache":                 "yep",
        "cache_lifetime":        "10",
        "gallery":               "yep",
        "private":               "nope",
        "hide-on-desktop":       "nope",
        "hide-on-mobile":        "nope",
        "show-only-media-posts": "nope",
        "titles":                "nope",
        "hidemeta":              "nope",
        "hidetext":              "nope",
        "heading":               "",
        "headingcolor":          "rgb(154, 78, 141)",
        "subheading":            "",
        "subheadingcolor":       "rgb(114, 112, 114)",
        "hhalign":               "center",
        "bgcolor":               "rgb(229, 229, 229)",
        "filter":                "yep",
        "filtercolor":           "rgb(205, 205, 205)",
        "mobileslider":          "nope",
        "viewportin":            "yep",
        "width":                 "260",
        "margin":                "20",
        "theme":                 "classic",
        "gc-style":              "style-1",
        "cardcolor":             "rgb(255, 255, 255)",
        "namecolor":             "rgb(154, 78, 141)",
        "textcolor":             "rgb(85, 85, 85)",
        "linkscolor":            "rgb(94, 159, 202)",
        "restcolor":             "rgb(132, 118, 129)",
        "shadow":                "rgba(0, 0, 0, 0.05)",
        "bcolor":                "rgba(240, 237, 231, 0.4)",
        "talign":                "left",
        "gf-style":              "style-3",
        "fcardcolor":            "rgb(64, 68, 71)",
        "fscardcolor":           "rgb(44, 45, 46)",
        "ftextcolor":            "rgb(255, 255, 255)",
        "fnamecolor":            "rgb(94, 191, 255)",
        "frestcolor":            "rgb(175, 195, 208)",
        "fbcolor":               "rgba(255, 255, 255, 0.4)",
        "mborder":               "nope",
        "ftalign":               "center",
        "compact-style":         "c-style-1",
        "cnamecolor":            "rgb(154, 78, 141)",
        "ctextcolor":            "rgb(85, 85, 85)",
        "clinkscolor":           "rgb(94, 159, 202)",
        "crestcolor":            "rgb(132, 118, 129)",
        "cbcolor":               "rgb(226, 226, 226)",
        "cmeta":                 "upic",
        "calign":                "left",
        "cards-num":             "3",
        "scrolltop":             "yep",
        "css":                   "",
        "feeds":                 [],
        "tv":                    "nope",
        "tv-int":                "5",
        "tv-logo":               "",
        "tv-bg":                 "",
        "big":                   "nope"
      }
    },
    initialize: function() {
      console.log('initialize Stream Model', this);
      // this.set('feeds', []);
    },
    save: function(isNew){
      var self = this;
      var feedsData;
      var $params = {
        emulateJSON: true,
        data: {
          action: isNew ? la_plugin_slug_down + '_create_stream' : la_plugin_slug_down + '_save_stream_settings',
          stream: this.toJSON()
        }
      };
      // legacy feeds to JSON
      if (typeof $params.data.stream.feeds !== 'string') {
        $params.data.stream.feeds = JSON.stringify($params.data.stream.feeds);
      }

      if ($params.data.stream.errors) delete $params.data.stream.errors;

      return Backbone.sync( 'create', this, $params ).done(function(serverModel){
        if (serverModel['id']) {
          self.set('id', serverModel['id'])
        }
        /*for (var prop in serverModel) {
          if (prop === 'feeds' && typeof serverModel[prop] !== 'object') serverModel[prop] = JSON.parse(serverModel[prop])
          self.set(prop, serverModel[prop])
        }*/
      }); // always 'create' because we can't use CRUD request names, only POST
    },
    fetch: function(){
      var $params = {
        emulateJSON: true,
        data: {
          'action': la_plugin_slug_down + '_get_stream_settings',
          'stream-id': this.get('id')
        }
      };
      return Backbone.sync( 'read', this, $params ).done(function () {
      })
    },
    destroy: function() {
      var self = this;
      var $params = {
        emulateJSON: true,
        type: 'GET',
        data: {
          'action': la_plugin_slug_down + '_delete_stream',
          'stream-id': this.get('id')
        }
      };
      return Backbone.sync( 'delete', this, $params ).done(function(){
        self.collection.remove(self);
      })
    },
    urlRoot: _ajaxurl,
    url: function () {
      return this.urlRoot;
    }
  });

  StreamRowModel = Backbone.Model.extend({
    defaults: function () {
      return {
        'name' : '',
        'status' : 'ok',
        'feeds' : []
      }
    },
    initialize: function() {
            console.log('initialize Stream Row Model', this);
    },
    destroy: function() {
      var self = this;
      var $params = {
        emulateJSON: true,
        type: 'GET',
        data: {
          'action': la_plugin_slug_down + '_delete_stream',
          'stream-id': this.get('id')
        }
      };
      ; //
      return Backbone.sync( 'delete', this, $params).done(function(){
        console.log('sync callback');
        self.collection.remove(self);
      })
    },
    clone: function() {
      var self = this;
      var $params = {
        emulateJSON: true,
        type: 'GET',
        data: {
          'action': la_plugin_slug_down + '_clone_stream',
          'stream': this.toJSON()
        }
      };
      return Backbone.sync( 'create', this, $params).done(function(stream){
        streamRowModels.add(stream);
      })
    },
    urlRoot: _ajaxurl,
    url: function () {
      return this.urlRoot;
    }
  });

  StreamModelsCollection = Backbone.Collection.extend({
    model: StreamModel
  });
  StreamRowModelsCollection = Backbone.Collection.extend({
    model: StreamRowModel
  });
  streamModels = new StreamModelsCollection();
  streamRowModels = new StreamRowModelsCollection();

  StreamRowView = Backbone.View.extend({
    model: StreamRowModel,
    tagName: "tr",
    template:  _.template(templates.streamRow),
    className: "stream-row",
    events: {
      "click .flaticon-pen, .td-name": "edit",
      "click .flaticon-trash": "destroy",
      "click .flaticon-copy": "clone"
    },

    initialize: function() {
      // var self = this;
      //
      // this.listenTo(this.model, "change", function () {
      //
      // });

      this.model.on('change', function(){
        console.log('render row model on change', arguments)
        this.render()
      }, this);

      this.model.view = this; // we can work with models collection now
      if (!this.rendered && !this.$el.data('stream-id')) {
        //this.render();
      }
    },

    rendered: false,

    render: function(changed) {
      var changed, prop;

      if (!this.rendered) {
        console.log('render row view', this.model);

        this.$el.html(this.template({
          id: this.model.get('id') || 'new',
          name: stripslashes(this.model.get('name')) || 'Unnamed',
          status: parseInt(this.model.get('status')) ? 'ok' : 'error',
          layout: this.model.get('layout') ? '<span class="icon-' + this.model.get('layout') + '">' : '-',
          feeds: this.getFeedsStr(this.model.get('feeds'))
        }));
        this.$el.attr('data-stream-id', this.model.get('id') || 'new');
        this.rendered = true;
      } else if (this.model.changed && !_.isEmpty(this.model.changed)) {
        console.log('changing row view', this.model);
        changed = this.model.changed;

        if (changed.hasOwnProperty('id')) {
          this.$el.find('.shortcode').html('[ff id="' + changed.id + '"]')
        }
        if (changed.hasOwnProperty('feeds')) {
          this.$el.find('.td-feed').html(this.getFeedsStr(this.model.get('feeds')));
        }
        if (changed.hasOwnProperty('layout')) {
          this.$el.find('.td-type').html(changed.layout ? '<span class="icon-' + this.model.get('layout') + '">' : '-')
        }
        if (changed.hasOwnProperty('status')) {
          this.$el.find('[class*=cache-status]').removeClass().addClass('cache-status-' + changed.status);
        }
        if (changed.hasOwnProperty('name')) {
          this.$el.find('.td-name').html(changed.name || 'Unnamed');
        }
      }
    },

    getFeedsStr: function (feeds) {
      var result = '';

      if (typeof feeds === 'string') {
        feeds = JSON.parse(feeds);
      }

      if (!feeds || !feeds.length) return '-';

      for (var i = 0, len = feeds.length; i < len; i++) {
          result += '<i class="flaticon-' + feeds[i]['type'] + '"></i>'
      }

      return result || '-';
    },

    edit: function(e, viewStays) {
      console.log('row edit', this);
      var defer = $.Deferred();

      var self = this, model, request;

      var id = this.model.get('id');

      if (!id) {
        alert('Something went wrong, please try to reload page')
      }

      if (!Controller.$container.find('#stream-view-' + id).length) {

        this.$el.addClass('stream-loading');

        model = new StreamModel({id: id});

        request = model.fetch();
        request.done(
            function (response, status, xhr) {
              var view;
              if (response.feeds && typeof response.feeds === 'string') {
                response.feeds = JSON.parse(response.feeds);
              }

              model.attributes = stripSlashesObjProps(response); // updated from server
              console.log('new StreamView')
              view = new StreamView({model: model});
              streamModels.add(model);

              Controller.$container.append(view.$el);

              self.$el.removeClass('stream-loading');

              defer.resolve(id);

              setTimeout(function () {
                if (!viewStays) Controller.switchToView(id);
              },100)

            }
        ).fail (function () {
          alert('Something went wrong, please try to reload page')
          self.$el.removeClass('stream-loading');
          defer.reject();
        })

      } else {
        if (!viewStays) Controller.switchToView(id);
        defer.resolve(id);
      }

      return defer.promise()
    },
    destroy: function() {
      var promise = Controller.confirmPopup('Just checking for misclick. Delete stream?');
      var self = this;

      promise.then(function(){
        var id = self.model.get('id');
        var request = self.model.destroy();
        Controller.makeOverlayTo('show');

        request.done(function(){
          self.remove();
          if (streamRowModels.length === 0) {
            Controller.$list.append(templates.streamRowEmpty);
          }
        }).always(function(){
          Controller.makeOverlayTo('hide');
        }).fail(function(){
          alert('Something went wrong, please try to reload page');
        })
      },function(){})
    },
    clone: function() {
      var self = this;
      var request = self.model.clone();

      Controller.makeOverlayTo('show');

      request.done(function(stream){
        var view = new StreamRowView({model: streamRowModels.get(stream.id)});
        Controller.$list.append(view.$el);

      }).always(function(){
        Controller.makeOverlayTo('hide');
      }).fail(function(){
        alert('Something went wrong, please try to reload page');
      })
    }
  });

  StreamView = Backbone.View.extend({
    tagname: "div",
    template:  _.template(templates.stream),
    className: "section-stream",
    streams: [],
    rowModel: null,
    rowView: null,
    currentId: 'new',
    events: {
      "click .admin-button.submit-button": "saveViaAjax",
      "change input, textarea": "updateModel",
      "colorpicker-change input": "updateModel",
      "change select:not(.stream-streams__select select)": "updateModel",
      "click .disabled-button": "disableAction",
//    "click .stream-streams__item": "showPreview",
      "click .stream-feeds__item": "detachFeed",
      "click .stream-feeds__block": "displayFeedsSelect",
      "click .stream-feeds__btn": "connectFeed",
      "change [id^=stream-layout]": "changeDesignMode",
      "change .input-not-obvious input": "saveName",
      "keyup .input-not-obvious input": "saveName",
      "change .design-step-2 select[id*=align]" : "previewChangeAlign",
      "change .design-step-2 select[id*=cmeta]" : "previewChangeUpic",
      "keyup .design-step-2 [id*=width]" : "previewChangeWidth",
      "change .design-step-2 select[id*=cmeta]" : "previewChangeUpic",
      "change .layout-compact select[id*=compact-style]" : "previewChangeCompact",
      "change .style-choice select[id*=style]" : "previewChangeStyle",
      "change .theme-choice input" : "previewChangeTheme"
    },

    initialize: function() {
      //this.listenTo(this.model, "change", this.render);
      var self = this;
      var rowModel, rowView;
      var rendered = this.rendered;

      this.model.view = this;

      this.render();

      this.model.listenTo(this, 'changeModel', function (data){
        //console.log('changeModel event', data);
        self.model.set(data.name, data.val);
      })

      if (this.model.isNew()) {

      } else {
        this.rowModel = streamRowModels.get(this.model.get('id'));
        console.log('binding models..')
        this.bindModels();
      }
    },

    bindModels: function () {
      var self = this;

      this.model.listenTo(feedsModel, 'change', function(changedModel){
        var streamFeeds = this.get('feeds');
        var allFeeds = feedsModel.get('feeds');
        var changedFeeds = changedModel.get('feeds_changed');
        var triggerRender = false, indexToDelete = -1;

        _.each(streamFeeds, function (feed, index) {
          var changed = changedFeeds[feed.id];
            if (changed) {
              if (changed['state'] === 'changed') {
                streamFeeds[index] = allFeeds[feed.id];
                triggerRender = true;
              } else if (changed['state'] === 'deleted') {
                indexToDelete = index;
                triggerRender = true;
              }
            }
        });

        if (indexToDelete > -1) streamFeeds.splice(indexToDelete, 1);

        if (triggerRender) {
          this.view.renderConnectedFeeds();
        }

        console.log('stream listening to feedsModel');
      }, this);

      this.rowModel.listenTo(this.model, 'stream-saved', function (model) {
        var attrs = self.model.attributes;
        for (var prop in attrs) {
          if (self.rowModel['attributes'][prop] !== undefined) {
            if (typeof attrs[prop] === 'object') {
              self.rowModel.set(prop, _.clone(attrs[prop]));
            } else {
              self.rowModel.set(prop, attrs[prop]);
            }
            console.log('changing row model once', prop)
          }
        }
      })
    },

    render: function() {
      var id = this.model.get('id');
      var self = this;
      console.log('render stream view');

      if ( !this.rendered || !this.currentId ) {
        this.$el.attr('data-view-mode', 'streams-update').attr('id', 'stream-view-' + (id || 'new'));

        this.$el.html(this.template({
          id: id || 'new',
          plugin_url: window.plugin_url,
          header: id && id != 'new' ? 'Stream #' + id : 'Creating...',
          version: window.plugin_ver,
          TV: templates.tv ? _.template(templates.tv)({id:id}) : '',
          TVtab: templates.tvTab || ''
        }))

        setTimeout(function () {
          self.$el.find(".input-not-obvious input").autoresize({padding:10,minWidth:56,maxWidth:400});
        })
        Controller.tabs.init(this.$el, id);

        setTimeout(function () {
          self.configDesign();
        },0)

      }

      this.setInputsValue();
      this.renderConnectedFeeds();

      this.currentId = id;
      this.rendered = true;

      $(document).trigger('stream_view_built', this.$el);

    },

    saveName: function (e) {

      var val = e.target.value;
      var type = e.type;
      var oldval

      if (/*e.type === 'change' || */e.type === 'keyup' && e.keyCode == 13) {
        this.saveViaAjax();
      }
    },

    saving: false,

    configDesign: function () {
      console.log('config design and cpickers')
      this.$el.find('input[data-color-format]').ColorPickerSliders(this.colorPickersConfig);
      this.$el.find('[id^=stream-layout]:checked, .theme-choice input:checked, select[id*=cmeta], .style-choice select[id*=style], .design-step-2 select[id*=align], .layout-compact select[id*=compact-style]').change();
      this.$el.find('.design-step-2 [id*=width]').keyup();
    },

    renderConnectedFeeds: function () {

      var feeds = this.model.get('feeds');
      var $cont = this.$el.find('.stream-feeds__list');
      var feed, name;
      var items = '';
      if (!feeds) return;
      for (var i = 0, len = feeds.length; i < len; i++) {
        feed = feeds[i];
        name = feed.content;

        if (!name && feed.type == "wordpress") {
          name = feed['category-name'] || feed['wordpress-type'];
        }

        if (name && feed.type == "twitter" && feed['timeline-type'] === 'list_timeline') {
          name += ' - ' + feed['list-name'];
        }

        if (name.length > 13) name = name.substr(0, 13) + '...';
        items += '<span data-id="' +  feed.id +'" class="stream-feeds__item stream-feeds__' + feed.type +  (feed.errors && feed.errors.length ? ' stream-feeds__error' : '') + '"><i class="stream-feeds__icon flaticon-' + feed.type + '"></i>' + stripslashes(name) + '</span>';
      }
      $cont.html('').append(items).closest('.stream-feeds').removeClass('stream-feeds--connecting');
    },
    
    connectFeed: function (e) {
      var self = this;

      var $t = $(e.target).closest('.stream-feeds__btn');
      var streamFeeds = this.model.get('feeds');
      var allFeeds = feedsModel.get('feeds');
      var feed;
      var val;

      var request;

      if ($t.is('.stream-feeds__close')) {
        $t.closest('.stream-feeds').removeClass('stream-feeds--connecting')
        return;
      }

      val = this.$el.find('.stream-feeds select :selected').val();

      feed = allFeeds[val];

      // double check it doesn't exist already
      if (feed && !_.find(streamFeeds, function(e){return e.id === val})) {
        streamFeeds.push(feed);
      }

      Controller.makeOverlayTo('show');

      request = this.model.save();

      request.done(function(serverModel){
        self.model.trigger('stream-saved');
        self.renderConnectedFeeds();
      }).always(function(){
        Controller.makeOverlayTo('hide');
      });
    },
    
    displayFeedsSelect: function () {

      var self = this;

      var connectedFeeds = this.model.get('feeds');
      var availableFeeds = _.clone(feedsModel.get('feeds'));

      var isEmpty = _.isEmpty(availableFeeds), isEmptyAfterFilter;
      var connectedFeedsIDs = {};

      var i, len, feed;

      var $select = this.$el.find('.stream-feeds select');
      var options = '';
      var name;

      _.each(connectedFeeds, function (el) { connectedFeedsIDs[el.id] = true; });


      // filter
      availableFeeds = _.filter(availableFeeds, function (val) {
        return !connectedFeedsIDs[val.id];
      })
      isEmptyAfterFilter = _.isEmpty(availableFeeds);

      if (isEmpty || isEmptyAfterFilter) {
        var msg = isEmpty ? 'You haven\'t created feeds yet. Go to Feeds tab to create?' : 'You connected all feeds already. Go to Feeds tab to create new?';
        var promise = Controller.confirmPopup(msg, 'neutral');

        promise.then(function(){
          Controller.$form.find('#sources-tab').click()
        },function(){});

        return
      }

      for (i = 0, len = availableFeeds.length; i < len; i++) {
        feed = availableFeeds[i];
        name = feed.content;
        if (!name && feed.type == "wordpress") {
          name = capitaliseFirstLetter(feed['category-name'] || feed['wordpress-type']);
        }
        if (name && feed.type == "twitter" && feed['timeline-type'] === 'list_timeline') {
          name += ' - ' + feed['list-name'];
        }
        options += '<option value="' + feed.id + '">' + capitaliseFirstLetter(feed.type) + ' - ' + name + '</option>';
      }

      $select.html('').append(options).closest('.stream-feeds').addClass('stream-feeds--connecting');
      $select.chosen("destroy");
      $select.chosen();
    },

    detachFeed: function (e) {
      var promise = Controller.confirmPopup('Detach feed from stream?');
      var self = this;
      var $t = $(e.target).closest('span');
      var id = $t.data('id');

      e.stopPropagation();

      promise.then(
          function success () {
            self.model.set('feeds', _.filter(self.model.get('feeds'), function(el){return el.id != id}));
            Controller.makeOverlayTo('show');

            var request = self.model.save();
            request.done(function(serverModel){
              self.model.trigger('stream-saved');
              $t.remove();
            }).always(function(){
              Controller.makeOverlayTo('hide');
            });
          },
          function fail () {

          }
      )
    },
    
    disableAction: function (e) {
      e.stopImmediatePropagation()
    },

    setInputsValue: function () {
      // console.log('set inputs value');
      var $input;
      var id = this.model.get('id');
      var attrs = this.model.attributes;
      var val;
      var optVal;
      var selector;
      var name;
      for ( name in attrs ) {
        //if (/s.+?\-f/.test(name)) continue;
        selector = '[name="stream-' + id + '-' + name + '"]';
        $input = this.$el.find( selector );
        val = typeof attrs[name] === 'object' ? JSON.stringify( attrs[name] ) : attrs[name];
        if ($input.length > 1) { // assume checkbox group
          optVal = attrs[name];
          if (typeof optVal === 'object') {
            $input.each(function(){
              var $t = $( this );
              $t.attr('checked', optVal[this.value]);
            });
            optVal = null;
          } else {
            $input.each(function(){
              var $t = $( this );
              $t.attr('checked', $t.val() == optVal);
            });
          }
        }
        else if ($input.is(':radio') || $input.is(':checkbox')) {
          $input.each(function(){
            var $t = $( this );
            $t.attr( 'checked', $t.val() == attrs[name] );
          });
        } else {
          $input.val(val ? stripslashes(val.toString()) : '');
        }
      }

    },

    changeDesignMode: function (e) {
      var val = e.currentTarget.value;
      var self = this;
      $(e.currentTarget).closest('.section').removeClass('grid-layout-chosen compact-layout-chosen').addClass(val + '-layout-chosen');
      setTimeout(function () {
        Controller.setHeight(self.model.get('id'));
      },0);
    },

    previewChangeAlign: function (e) {
      var val = e.target.value;
      var $preview = $(e.target).closest('dl').find('.preview .ff-stream-wrapper');
      $preview.css('text-align', val);
    },

    previewChangeUpic: function (e) {
      var val = e.target.value;
      var $preview = $(e.target).closest('dl').find('.preview .ff-stream-wrapper');
      if (val === 'upic') {
        $preview.addClass('ff-c-upic');
      } else {
        $preview.removeClass('ff-c-upic');
      }
    },

    previewChangeCompact: function (e) {
      var val = e.target.value;
      var $preview = $(e.target).closest('dl').find('.preview .ff-stream-wrapper');
      var cls = $preview.attr( 'class' );

      if (val === 'c-style-1') {
        $preview.find('.ff-item-cont').append($preview.find('.ff-item-meta'));
      } else if (val === 'c-style-2') {
        $preview.find('.ff-item-cont').after($preview.find('.ff-item-meta'));
      }

      $preview.removeClass(function() {
        return cls.match(/ff-c-style-[1-9]/)[0];
      }).addClass('ff-' + val);
    },

    previewChangeStyle: function (e) {
      var val = e.target.value;
      var $preview = $(e.target).closest('dl').find('.preview .ff-stream-wrapper');
      var cls = $preview.attr( 'class' );

      if (/flat/.test(cls)) {
        this.revert($preview);
        this.reformat($preview, val);
      }

      $preview.removeClass(function() {
        return cls.match(/ff-style-[1-9]/)[0];
      }).addClass('ff-' + val);
    },

    previewChangeTheme: function (e) {
      var val = e.target.value;
      var $cont = $(e.target).closest('.design-step-2');

      $cont.find('.style-choice').hide();
      $cont.find('.' + val + '-style').show();
    },

    previewChangeWidth: function (e) {
      var val = e.target.value;
      var $preview = $(e.target).closest('.design-step-2').find('.classic-style .preview, .flat-style .preview');

      val = parseInt(val);

      if (isNaN(val)) return;

      $preview.find('.ff-item').css('width', val + 'px')
    },

    reformat: function  ($stream, style) {
      $stream.find('.ff-item').each(function(i,el){
        var $el = $(el);
        var $img = $el.find('.ff-img-holder');
        var $meta;

        if (/[12]/.test(style)) {
          $meta = $el.find('.ff-item-meta');
          $el.find('.ff-item-cont').prepend($meta);

          if (!$img.length) {
            if (style === 'style-1') {
              $meta.append($meta.find('.ff-userpic'));
            }
            $el.addClass('ff-no-image')
          } else {
            $el.addClass('ff-image')
          }
        } else if (style === 'style-3') {
          $el.prepend($el.find('.ff-icon'));
        }

        $el.addClass('ff-' + (!$img.length ? 'no-' : '') +'image');

        $el.prepend($img);
      })
    },

    revert: function ($stream) {
      $stream.find('.ff-item').each(function(i,el){
        //console.log('revert',el)
        var $el = $(el);
        var $cont = $el.find('.ff-item-cont');

        $cont.append($cont.find('h4'));
        $cont.append($cont.find('.ff-img-holder'));
        $cont.append($cont.find('p'));
        $cont.append($cont.find('.ff-item-meta'));

        $el.find('.ff-userpic').append($el.find('.ff-icon'))
      })
    },

    colorPickersConfig : {
      previewontriggerelement: true,
      previewformat: 'rgba',
      flat: false,
      color: 'rgb(255, 88, 115)',
      customswatches: 'card_bg',
      swatches: [
        '#c0392b',
        'a3503c',
        '925873',
        '927758',
        '589272',
        '588c92',
        '2bb1c0',
        '2b8ac0',
        'e96701',
        'c02b74',
        '000000',
        '4C4C4C',
        'CCCCCC',
        'F0F0F0',
        'FFFFFF'
      ],
      order: {
        hsl: 1,
        opacity: 2,
        preview: 3
      },
      onchange: function(container, color) {
        var $preview = container.data('preview');
        var sel = container.data('prop').replace(/-\d+/, '');
        var $targ = $preview.find('[data-preview*="' + sel + '"]');
        var $inp = container.data('input');
        var prop = $inp.attr('data-prop');
        var pre = '';
        $inp.trigger('colorpicker-change');

        if (!$targ.length) return;

        if (prop === 'box-shadow') pre = '0 1px 4px 0 ';
        $targ.each(function(){
          var $t = $(this);
          //console.log(this, $t.attr('data-overrideProp') || prop)
          var col = color.tiny.toRgbString();
          $t.css($t.attr('data-overrideProp') || prop, pre + col)
        });
      }
    },

    goBack: function() {
      Controller.switchToView('list');
    },

    updateModel: function(event) {
      var $t = $(event.target);
      var val = $t.val();
      var name = $t.attr('name');
      var $group;

      if (!name ) {
        return;
      }

      if ($t.is(':radio')) {
        val = $t.is(':checked') ? ($t.attr('value') || 'yep') : 'nope'
      }

      if ($t.is(':checkbox')) {
        $group = this.$el.find('[name="' + name + '"]');
        if ($group.length > 1) {
          // group
          val = {};
          $group.each(function () {
            var cbVal = this.value;
            if (this.checked) val[cbVal] = 'yep';
          });
        } else {
          val = $t.is(':checked') ? ($t.attr('value') || 'yep') : 'nope'
        }
      }

      this.trigger('changeModel', {name: name.replace('stream-' + (this.model.get('id') || 'new') + '-', ''), val: val })
    },

    saveViaAjax: function(e) {

      if (this.saving) return;
      else this.saving = true;
      console.log('save stream');

      if (e) e.stopImmediatePropagation();

      var self = this;
      var wasEmptyList = streamRowModels.length === 0;
      var $t = $(e ? e.target : '');
      var isNew = this.model.isNew();

      // validation in popup
      if ($t.is('[id^=networks-sbmt]')) {
          if (!this.validateFeedCfg($t)) return false;
      }

      Controller.makeOverlayTo('show');
      $t.addClass('button-in-progress');

      var promise = this.model.save(isNew);

      promise.done(function(serverModel){
        Controller.makeOverlayTo('hide');

        self.render();

        if (isNew) {
          self.rowModel = new StreamRowModel();
          self.rowView = new StreamRowView({model: self.rowModel});
          streamRowModels.add(self.rowModel);

          Controller.$list.append(self.rowView.$el);

          self.bindModels();

          self.$el.find('.input-not-obvious input').focus();

        }

        self.rowModel.set('id', serverModel.id);
        self.model.trigger('stream-saved');

        if (wasEmptyList) {
          Controller.$list.find('.empty-row').remove();
        }

        sessionStorage.setItem('ff_stream', serverModel.id);

        $t.addClass('updated-button').html('&#10004;&nbsp;&nbsp;Updated');
        $t.removeClass('button-in-progress');

        setTimeout( function () {
          $t.html('Save changes').removeClass('updated-button');
        }, 2500);

      }).fail(function(){
        alert('Something went wrong. Please try to reload page. If this repeats please contact support at http://looks-awesome.com/help')
      }).always(function () {
        self.saving = false;
      });
    },

    showPreview: function (e) {
      var $t = $(e.target);
      var id = $t.data('id');
      Controller.makeOverlayTo('show');
      $.get(_ajaxurl, {
        'action' :  'flow_flow_show_preview',
        'stream-id' : id
      }).success(function(response){
        var $popup = $('.content-popup');
        var $body = $('body');
        Controller.makeOverlayTo('hide');

        $body.css('overflow', 'hidden');
        $popup.off(transitionEnd).addClass('is-visible').find('.content-popup__content').html(response);

        if (Controller.$previewStyles) {
          Controller.$previewStyles.appendTo('head');
        }

        $popup.on('click', function(event){
          if( $(event.target).is('.content-popup__close') || $(event.target).is('.content-popup') ) {
            event.preventDefault();
            var self = this;
            $(this).removeClass('is-visible');
            $popup.off('click');
            $popup.on(transitionEnd, function(){
              $popup.find('.content-popup__content').html('').off(transitionEnd);
              $body.find('.ff-slideshow').remove();
              if (!Controller.$previewStyles) {
                Controller.$previewStyles = $('#ff_style, #ff_ad_style');
              }
              Controller.$previewStyles.detach();
            })
            $body.css('overflow', '');
          }
        });
      }).fail(function(){
        Controller.makeOverlayTo('hide');

        alert('Something went wrong. Please try again after page refresh')
      })
    },
  });

  // Feeds MVC

  FeedsModel = Backbone.Model.extend({
    defaults: function () {
      return {
        "feeds": {},
        "feeds_changed": {}
      }
    },
    initialize: function() {
      console.log('initialize Feeds Model', this);
    },
    save: function(isNew){
      var self = this;
      var feedsData;
      var $params = {
        emulateJSON: true,
        data: {
          action: la_plugin_slug_down + '_save_sources_settings',
          model: this.toJSON()
        }
      };

      return Backbone.sync( 'create', this, $params ).done(function(serverModel){
        if (self.isNew() && serverModel['id']) {
          self.set('id', serverModel['id']);
        }

        // update order
        if (serverModel['feeds']) {
          for (var feed in serverModel['feeds']) {
            serverModel['feeds'][feed] = stripSlashesObjProps(serverModel['feeds'][feed]);
          }

          if (_.isArray(serverModel['feeds'])) serverModel['feeds'] = {};
          self.set('feeds', serverModel['feeds']);
        }
      });
    },
    urlRoot: _ajaxurl,
    url: function () {
      return this.urlRoot;
    }
  });

  FeedsView = Backbone.View.extend({
    rendered: false,
    paginator: null,
    currentPage: 0,
    $popup: null,
    $tab: null,
    feedChanged: false,
    showErrorFeedsOnly: false,
    errorsPresent: false,
    events: {
      "click .submit-button": "saveViaAjax",
      "click .button-add": "addFeedStepOne",
      "click .flaticon-pen, .td-feed": "editFeed",
      "mouseenter .td-more i": "toggleDropDown",
      "mouseleave .td-more": "popupLeave",
      "click [data-action='filter']": "filterFeed",
      "click [data-action='cache']": "resetFeedCache",
      "click .flaticon-copy": "cloneFeed",
      "click .flaticon-trash": "deleteFeed",
      "click .tr-error": "hideError",
      "click .button-go-back": "addFeedGoBack",
      "click .networks-list > li": "createFeedView",
      "click .popup .button-cancel-action, .popupclose": "closeFeedPopup",
      "click .ff-pseudo-link": "toggleErrorFeeds",
      "change .feed-view input": "updateModel",
      "change .feed-view textarea": "updateModel",
      "change .feed-view select": "updateModel",
      "change td .switcher": "toggleFeed",
      "mouseenter .feeds-list tr": "showErrorIfPresent",
      "mouseleave .feeds-list tr": "hideError",
    },

    initialize: function() {
      var self = this;
      this.model.view = this;

      this.$tab = $('#sources-tab');
      this.render();
      this.$popup = this.$el.find('.popup');


      this.model.listenTo(this, 'changeFeedInModel', function (data){
        console.log('changeFeedInModel event', data);
        var feeds = self.model.get('feeds');
        var feed = feeds[data.id];
        if (feed) {
          feed[data.name] = data.val;
        }
      })

      $(window).on('unload', this.savePage.bind(this));

    },

    render: function(){
      var self = this;
      var views = '';
      var filterViews = '';
      var feeds = this.model.get('feeds');
      var savedPage;
      var changed = this.model.get('feeds_changed'), prop, state;

      if (!this.model.isNew()) {
        this.renderFeedsList();
      }

      if (!this.rendered) {
        _.each(feeds, function (el) {
          if (!el.type) {
            return;
          }
          views += _.template(templates[el.type + 'View'])({
            uid: el.id
          });
          filterViews += _.template(templates['filterView'])({
            uid: el.id
          });
        });
        this.$el.find('#feed-views').html(views);
        this.$el.find('#filter-views').html(filterViews);
        this.setInputsValue();
      } else {
        for ( prop in changed ) {
          state = changed[prop]['state'];
          if (state !== 'changed') {
             if (state === 'deleted') {
               // do nothing?
             } else if (state === 'created') {
                this.$el.find('.feed-view-dynamic').removeClass('feed-view-dynamic');
             }
          }
        }
      }

      this.addFeedErrors();
      this.paginator = this.initPaginator();

      if (this.errorsPresent) {
        this.$tab.addClass('errors-present');
      } else {
        this.$tab.removeClass('errors-present');
      }

      if (this.currentPage) {
        this.paginator.paginate(typeof this.currentPage === 'number' ? this.currentPage : 1);
        this.currentPage = false;
      } else {
        savedPage = parseInt(sessionStorage.getItem('ff_feeds_page')||1);
        if (savedPage > 1) {
          this.paginator.paginate(savedPage);
          this.currentPage = savedPage;
          sessionStorage.setItem('ff_feeds_page', -1); // one time
        }
      }

      // always reset
      this.model.set('feeds_changed', {});

      this.rendered = true;

    },

    toggleFeed: function (e) {
      var $t = $(e.target);
      var uid = $t.closest('[data-uid]').data('uid');
      var feeds = this.model.get('feeds');
      var $channeling = this.$popup.find('[data-uid="' + uid + '"] > input:hidden');

      //feeds[uid]['enabled'] = e.target.checked ? 'yep' : 'nope';
      $channeling.val(e.target.checked ? 'yep' : 'nope').change();
      this.saveViaAjax();
    },

    savePage: function () {
      sessionStorage.setItem('ff_feeds_page', this.paginator._currentPageNum);
    },

    addFeedErrors: function () {
      var feeds = this.model.get('feeds');
      var self = this;

      self.errorsPresent = false;

      _.each(feeds, function (feed) {
        var errors = feed.errors;
        var id = feed.id;
        var error, $feed, $error;
        if (errors ) {
          if (typeof errors !== 'object') {
            errors = JSON.parse(errors);
          }

          if (!errors.length) return;

          $feed = self.$el.find('tr[data-uid="' + id + '"]');
          $error = $('<span class="cache-status-error"></span>');
          $error.data('err', errors);
          $feed.find('.td-status').html('').append($error).parent().addClass('tr-error');
          self.errorsPresent = true;
        }
      });
    },

    setInputsValue: function (changed) {

      var feeds = this.model.get('feeds');
      var self = this;
      if (typeof feeds !== 'object') feeds = JSON.parse(feeds);
      _.each(feeds, function (feed) {
        var uid, name, $input;

        uid = feed.id;

        for ( name in feed ) {

          if ( name === 'id' || name === 'type' ) continue;

          $input = self.$el.find('[name="' + uid + '-' + name + '"]');

          if ($input.is(':radio') || $input.is(':checkbox')) {

            $input.each(function(){
              var $t = $( this );
              if ($t.val() == feed[name]) $t.attr('checked', true);
            });

          } else {
            $input.val(feed[name]);
          }
        }
      });
    },

    initPaginator: function () {
      if (this.$el.find("#feeds-list tr:visible").length > 8) {
        this.$el.addClass('jp-visible');
      } else {
        this.$el.removeClass('jp-visible');
      }

      return this.$el.find("div.holder").jPages({
        containerID : "feeds-list",
        previous : "←",
        next : "→",
        perPage : 8,
        delay : 0,
        animation : 'yes'
      }).data('jPages');
    },

    renderFeedsList: function () {
      console.log('renderFeedsList')
      var feedsListStr = '';
      var feeds = this.model.get('feeds');

      var name, i, len;

      if ( !_.isEmpty(feeds) ) {
        _.each(feeds, function (feed) {
          var uid, enabled, status, lastUpdate;
          var $feed, $error, info, prop, ikey, ival, interval;
          var settings = {};

          uid = feed.id;

          info = '';

          if (feed['content']) {
            settings['content'] = feed['content'];
          } else {
            settings['content'] = feed['category-name'] || feed['wordpress-type'];
          }
          if (feed['timeline-type']) settings['timeline-type'] = feed['timeline-type'];
          if (feed['mod'] === 'yep') settings['mod'] = feed['mod'];

          for (prop in settings) {
if (prop === 'content') debugger
            ikey = capitaliseFirstLetter( prop.replace(' timeline', '').replace('_', ' ').replace('-', ' ').replace('timeline ', '')  );
            ival = stripslashes( settings[prop] );
            if (prop !== 'content') ival = capitaliseFirstLetter ( ival );
            if (prop === 'mod') ival = 'moderated';
            
            ival = ival.replace('_timeline', '').replace('http://', '').replace('https://', '');
            if (ival.length > 20) {
              ival = ival.substring(0, 20) + '...';
            }
            info = info + '<span><span class="highlight">' + ival + '</span></span>' ;
          }

          if (feed.cache_lifetime == 5) {
            interval = 'Every 5 min';
          } else if (feed.cache_lifetime == 30) {
            interval = 'Every 30 min';
          } else if (feed.cache_lifetime == 60) {
            interval = 'Every hour';
          } else if (feed.cache_lifetime == 360) {
            interval = 'Every 6 hours';
          } else if (feed.cache_lifetime == 1440) {
            interval = 'Once a day';
          } else if (feed.cache_lifetime == 10080) {
            interval = 'Once a week';
          }

          status = (feed.status == 1) ? '<span class="cache-status-ok">' : '<span class="cache-status-error">';
          lastUpdate = feed.last_update && feed.last_update !== 'N/A' ? (feed.last_update  + ' (' + interval + ')') : 'N/A';

          feedsListStr = feedsListStr +
            '<tr data-uid="' + uid + '" data-network="' + feed.type + '" class="' + ( feed.enabled == 'yep' ? 'feed-enabled' : '' ) + '">' +
              '<td class="controls"><i class="flaticon-pen"></i> <i class="flaticon-copy"></i> <i class="flaticon-trash"></i></td>' +
              '<td class="td-feed"><i class="flaticon-' + feed.type + '"></i>' + /*capitaliseFirstLetter(feed.type) +*/ '</td>' +
              '<td class="td-status">' +status+ '</span></td>' +
              '<td class="td-info">' + info + '</td>' +
              '<td class="td-last-update">' + lastUpdate + '</td>' +
              '<td class="td-enabled"><label for="feed-enabled-' + uid + '"><input ' + ( feed.enabled == 'yep' ? 'checked' : '' ) + ' id="feed-enabled-' + uid + '" class="switcher" type="checkbox" name="feed-enabled-' + uid + '" value="yep"><div><div></div></div></label></td>' +
              '<td class="td-more"><i class="flaticon-more-1"></i><ul class="feed-dropdown-menu"><li data-action="filter">Filter feed</li><li data-action="cache">Rebuild cache</li></ul></td>' +
            '</tr>';
        });

      } else {
        feedsListStr = '<tr><td  class="empty-cell" colspan="7">Please add at least one feed</td></tr>';
      }

      this.$el.find('table.feeds-list tbody').html(feedsListStr);
    },

    hideError: function (e) {
      var $rel = $(e.relatedTarget);
      if ($rel.is('#error-popup')) return;
      Controller.$errorPopup.removeClass('visible');
    },

    addFeedStepOne: function(e){
      this.$popup.removeClass('add-feed-step-2').addClass('add-feed-step-1');
      Controller.checkScrollbar();
      Controller.setScrollbar();
      Controller.$html.addClass('popup_visible');
      this.$popup.on('click', this.popupClick);
    },

    editFeed: function (e) {
      var $t = $(e.target);
      var uid = $t.closest('[data-uid]').data('uid');
      var $popup = this.$popup;
      var feed = this.model.get('feeds') ? this.model.get('feeds')[uid] : null
      // popup scroll
      $popup.find('.feed-view-visible').removeClass('feed-view-visible');
      $popup.find('.feed-view[data-uid=' + uid + ']').addClass('feed-view-visible');
      $popup.addClass('add-feed-step-2');

      $popup.find('.feed-popup-controls').hide();
      if (feed && feed.enabled === 'nope') {
        $popup.find('.feed-popup-controls.enable').show();
      } else {
        $popup.find('.feed-popup-controls.edit').show();
      }

      Controller.checkScrollbar();
      Controller.setScrollbar();
      Controller.$html.addClass('popup_visible');
      $popup.on('click', this.popupClick);
    },

    popupClick: function (e) {
      if ($(e.target).is('.popup')) $('.active .popup .popupclose').click();
    },

    filterFeed: function (e) {
      var $t = $(e.target);
      var $cont = $t.closest('.section');
      var uid = $t.closest('[data-uid]').attr('data-uid');
      var $popup = this.$popup;
      var top = $popup.offset().top;
      $popup.find('.feed-view-visible').removeClass('feed-view-visible');
      $popup.find('.feed-view[data-filter-uid=' + uid + ']').addClass('feed-view-visible');
      $popup.addClass('add-feed-step-2');

      $popup.find('.feed-popup-controls').hide();
      $popup.find('.feed-popup-controls.edit').show();
      Controller.checkScrollbar();
      Controller.setScrollbar();
      Controller.$html.addClass('popup_visible');
      $popup.on('click', this.popupClick);
    },

    resetFeedCache: function (e) {
      var $t = $(e.target);
      var uid = $t.closest('[data-uid]').attr('data-uid');
      var changed = this.model.get('feeds_changed'), curr;
      changed[uid] = {'id': uid, 'state': 'reset_cache'};
      this.saveViaAjax();
    },

    toggleDropDown: function (e) {
      var self = this;
      var $t = $(e.target);
      var $cont = $t.closest('td');
      var isOpened = $cont.data('popup') === 'opened';

      $('td.open').removeClass('open').data('popup', '');
      if (isOpened) {
        $cont.removeClass('open');
        $cont.data('popup', '');
        //Controller.$body.off('click', this.popupMoreClick);
      } else {
        setTimeout(function () {
          $cont.addClass('open');
          $cont.data('popup', 'opened');
          //Controller.$body.on('click', self.popupMoreClick);
        }, 0)
      }
    },

    popupMoreClick: function (e) {
      var $t = $(e.target)
      if (!$t.closest('.feed-dropdown-menu').length) {
        $('td.open').removeClass('open').data('popup', '');
        Controller.$body.off('click', this.popupMoreClick);
      }
    },

    popupLeave: function () {
      $('td.open').removeClass('open').data('popup', '');
    },

    deleteFeed: function (e) {
      var promise = Controller.confirmPopup('Do you want to permanently delete this feed?');
      var $t = $(e.currentTarget);
      var self = this;
      promise.then(function success(){
        var uid = $t.closest('[data-uid]').attr('data-uid');
        var $cont = $t.closest('.section');
        var $popup = self.$popup;
        var modelFeeds = self.model.get('feeds');

        var $view = $popup.find('.feed-view[data-uid=' + uid + ']');

        var changed = self.model.get('feeds_changed'), curr;
        var found;

        changed[uid] = {'id': uid, 'state': 'deleted'};

        if (self.paginator._items.length - 1 < self.paginator.options.perPage * self.paginator._currentPageNum - (self.paginator.options.perPage - 1) ) {
          self.currentPage = self.paginator._currentPageNum - 1 || 1;
        } else {
          self.currentPage = self.paginator._currentPageNum;
        }
        delete modelFeeds[uid];

        self.saveViaAjax();

      }, function fail () {})
    },

    cloneFeed: function (e) {
      var self = this;
      var $t = $(e.currentTarget);
      var $cont = $t.closest('.section');
      var $popup = this.$popup;
      var $parent = $t.closest('[data-uid]');
      var network = $parent.data('network');
      var oldUid = $parent.data('uid');
      var newUid = Controller.getRandomId();
      var $source = $popup.find('.feed-view[data-uid=' + oldUid + ']');
      var compiled = _.template(templates[network + 'View'])({uid: newUid});
      var $clone = $(compiled).data('fid', newUid);
      var filterCompiled  = _.template(templates['filterView'])({uid: newUid});
      var $filterView = $(filterCompiled);
      var feeds = this.model.get('feeds');
      var changed = this.model.get('feeds_changed');
      var errors = feeds[oldUid]['errors'];

      $clone.add($filterView).data('fid', newUid);
      $popup.find('#feed-views').prepend($clone);
      $popup.find('#filter-views').prepend($filterView);
      ////
      $clone.find(':input').each(function(i, el) {
        var $input = $(this);
        var name = $input.attr('name');
        var $orig = $source.find('[name="' + name.replace(newUid, oldUid) + '"]');

        if ($orig.is(':radio') || $orig.is(':checkbox')) {
          $orig.each(function(i, el){
            var $t = $( this );
            if ($t.is(':checked') && $t.attr('id').replace(oldUid, newUid) == $input.attr('id')) {
              $input.attr('checked', true);
            }
          })
        } else {
          $input.val($source.find('[name="' + name.replace(newUid, oldUid) + '"]').val());
        }
      });
      ////
      this.addFeedInModel($clone, newUid, errors);

      changed[newUid] = {'id': newUid, 'state':  'created'};
      this.saveViaAjax(false, false);
    },

    closeFeedPopup: function (e) {
      Controller.$html.removeClass('popup_visible');
      Controller.resetScrollbar();

      var $popup = this.$popup;
      var changed, existingIndex, id, curr;

      if ($popup.length) {
        $popup.off('click', this.popupClick);
        var $fresh = $popup.find('.feed-view-dynamic');

        if ($fresh.length && this.feedChanged) {
          changed = this.model.get('feeds_changed');
          id = $fresh.data('uid');

          delete changed[id];

          $fresh.remove();

          if (this.model.get('feeds').length) this.model.get('feeds').pop();

        }

        setTimeout(function () {
          $popup.removeClass('add-feed-step-1 add-feed-step-2');
        }, 400);

        this.feedChanged = false;
      }
    },

    showErrorIfPresent: function (e) {

      var $error = $(e.currentTarget).find('.cache-status-error'), errorStr = '';
      if (!$error.length) return;
      var errorData = $error.data('err');

      if (errorData && errorData[0]) {
        errorData = errorData[0];
      } else {
        return;
      }

      var messages = errorData['message'];

      if (messages) {
        if ($.isArray(messages)) {
          for (var i = 0, len = messages.length; i < len;i++) {
            if (i > 0) errorStr += '<br>';

            errorStr += messages[i]['msg'];
          }
        } else if (typeof messages === 'object') {
          if (messages['msg']) {
            errorStr += messages['msg'];
          } else {
            try {
              errorStr += JSON.stringify(messages)
            } catch (e) {
              errorStr += 'Unknown. Please ask support'
            }
          }
        } else if (typeof messages === 'string')  {
          errorStr += messages
        }
      } else if (errorData['msg']) {
        errorStr += errorData['msg'];
      } else if  ($.isArray(errorData)) {
        if (errorData[0].msg) {
          errorStr += errorData[0].msg;
        } else {
          try {
            errorStr += JSON.stringify(errorData[0])
          } catch (e) {
            errorStr += 'Unknown error. Please <a href="http://looks-awesome.com/help">submit ticket</a> and send access'
          }
        }
      } else {
        try {
          errorStr += JSON.stringify(errorData)
        } catch (e) {
          errorStr += 'Unknown error. Please <a href="http://looks-awesome.com/help">submit ticket</a> and send access'
        }
      }

      var offset = $error.offset();
      Controller.$errorPopup.addClass('visible').css({top: offset.top - 20, left: offset.left + 50});

      Controller.$errorPopup.html('<h4>Plugin received next error from network API while requesting this feed:</h4><p>' + errorStr + '</p>')
    },

    addFeedGoBack: function (e) {
      var $t = $(e.target);
      var $popup = this.$popup;
      var feeds = this.model.get('feeds');
      var $view = $popup.find('.feed-view-dynamic')
      var uid = $view.data('uid')

      $popup.removeClass('add-feed-step-2').addClass('add-feed-step-1');
      $popup.find('.feed-view-dynamic').remove();

      if (this.feedChanged) {
        delete feeds[uid];
        this.feedChanged = false;
      }
    },

    createFeedView: function (e) {
      var $t = $( e.currentTarget );
      var $popup = this.$popup;
      var network = $t.data('network');
      var fid = Controller.getRandomId();

      var compiled = _.template(templates[network + 'View'])({uid: fid});
      var filterCompiled  = _.template(templates['filterView'])({uid: fid});
      var $view = $(compiled);
      var $filterView = $(filterCompiled);

      $popup.find('.feed-view-visible').removeClass('feed-view-visible');
      $view.addClass('feed-view-visible').add($filterView).addClass('feed-view-dynamic').data('fid', fid);
      $popup.removeClass('add-feed-step-1').addClass('add-feed-step-2');
      $popup.find('.feed-popup-controls').hide();
      $popup.find('.networks-content .feed-popup-controls.add').show();
      $popup.find('#feed-views').prepend($view);
      $popup.find('#filter-views').prepend($filterView);

      this.feedChanged = true;
      this.addFeedInModel($view, fid);

      if ($view.attr('data-feed-type') === 'wordpress') {
        $view.find('input:radio').first().change();
      }
    },

    updateModel: function (event) {

      var $t = $(event.currentTarget);
      var val = $t.val();
      var name = $t.attr('name');
      var $group;
      var $view = $t.closest('.feed-view');
      var id = $view.data('uid') || $view.data('filter-uid');
      var isFresh = $view.is('.feed-view-dynamic');
      var changed = this.model.get('feeds_changed'), curr;
      if (!name ) {
        return;
      }
      changed[id] = {'id': id, 'state': (isFresh ? 'created' : 'changed')};

      if ($t.is(':radio')) {
        val = $t.is(':checked') ? ($t.attr('value') || 'yep') : 'nope'
      }

      if ($t.is(':checkbox')) {
        $group = this.$el.find('[name="' + name + '"]');
        if ($group.length > 1) {
          // group
          val = {};
          $group.each(function () {
            var cbVal = this.value;
            if (this.checked) val[cbVal] = 'yep';
          });
        } else {
          val = $t.is(':checked') ? ($t.attr('value') || 'yep') : 'nope'
        }
      }
      this.trigger('changeFeedInModel', {name: name.replace(id + '-', ''), val: val, id: id })
    },

    addFeedInModel: function ($view, id, errors) {

      var obj = {};
      var modelFeeds = this.model.get('feeds'), freshFeeds;
      $view.find(':input').each(function (i, el) {
        var $t = $(this);
        var name = $t.attr('name');
        name = name.replace(/\w\w\d+?\-/, '');
        if ($t.is(':radio')) {
          if ($t.is(':checked')) {
            obj[name] = $t.val();
          }
        } else if ($t.is(':checkbox')) {
          if ($t.is(':checked')) {
            obj[name] = $.trim($t.val());
          } else {
            obj[name] = 'nope';
          }
        }
        else {
          obj[name] = $.trim($t.val());
        }
      });

      obj['id'] = id;
      obj['type'] = $view.data('feed-type');
      obj['filter-by-words'] = $view.parent().next().find('input').val() || '';
      if (errors) obj['errors'] = errors;
      if (modelFeeds) {
        modelFeeds[id] = obj;
      } else {
        freshFeeds = {};
        freshFeeds[id] = obj;
        this.model.set('feeds', freshFeeds);
      }
    },

    validateFeedCfg: function ($t) {
      var $cont = $t.closest('.networks-content').find('.feed-view-visible');
      var $contentInput = $cont.find('input[name$=content]');
      $cont.find(':input').removeClass('validation-error');

      if ($contentInput.length && !$contentInput.val()) {
        setTimeout(function(){$contentInput.addClass('validation-error');},0);
        $('html, body').animate({
          scrollTop: $contentInput.offset().top - 150
        }, 300);
        return false;
      }
      return true;
    },

    toggleErrorFeeds: function (e) {
      var $list = this.$el.find('#feeds-list');
      var $t = $(e.currentTarget);

      if (this.showErrorFeedsOnly) {
        $list.removeClass('show-only-errors');
        this.showErrorFeedsOnly = false;
        $t.html('Show only error feeds');
      } else {
        $list.addClass('show-only-errors');
        $t.html('Show all feeds');
        this.showErrorFeedsOnly = true;
      }

      $list.jPages('destroy');

      this.paginator = this.initPaginator();
      return false;
    },

    saveViaAjax: function (e, savePage) {
      if (e) e.stopImmediatePropagation();
      var self = this;
      var $t = $(e ? e.target : '');
      var isNew = this.model.isNew();
      var uid;
      var feeds = this.model.get('feeds');
      var $channeling;

      // validation in popup
      if ($t.is('[id^=feed-sbmt]')) {
        if (!this.validateFeedCfg($t)) return;
      }
      // store page
      if (savePage) this.currentPage = this.paginator._currentPageNum;
      // enable if disabled

      uid = this.$el.find('.feed-view-visible').data('uid');

      if (e && uid && feeds[uid] && feeds[uid]['enabled'] === 'nope') {
        $channeling = this.$popup.find('[data-uid="' + uid + '"] > input:hidden');
        $channeling.val('yep').change();
      }

      Controller.makeOverlayTo('show');
      $t.addClass('button-in-progress');
      var promise = this.model.save(isNew);

      promise.done(function(serverModel){
        var oldText = $t.html();

        Controller.makeOverlayTo('hide');

        self.render();

        $t.addClass('updated-button').html('&#10004;&nbsp;&nbsp;Updated');
        $t.removeClass('button-in-progress');

        setTimeout( function () {
          $t.html(oldText).removeClass('updated-button');
        }, 2500);

      }).fail(function(){
        alert('Something went wrong. Please try to reload page. If this repeats please contact support at http://looks-awesome.com/help')
      });
    }
  });

  // expand/collapse section module

  var sectionExpandCollapse = (function($) {

    if (!window.Backbone) return {init: function(){}}

    var storage = window.localStorage && JSON.parse(localStorage.getItem('ff_sections')) || {};

    var SectionsModel = Backbone.Model.extend({
      initialize: function() {
        if (storage[this.id]) {
          this.set('collapsed', storage[this.id]['collapsed']);
        } else {
          storage[this.id] = {collapsed: {}}
        }
        this.on('change', function(){
          if (window.localStorage) {
            storage[this.id]['collapsed'] = this.get('collapsed');
            window.localStorage.setItem('ff_sections', JSON.stringify(storage))
          }
        })
      },
      defaults : function () {
        return {
          'collapsed' : {}
        }
      }
    });

    var SectionsView =  Backbone.View.extend({
      initialize: function() {
        this.model.view = this;
        this.$sections = this.$el.find('> .section');
        this.render();
      },
      render: function(){
        var self = this;
        // add class if collapsed
        self.$sections.each(function(){
          var $t = $(this);
          var index = self.$sections.index(this);
          $t.append('<span class="section__toggle flaticon-arrow-down"></span>');

          if (self.model.get('collapsed')[index]) $t.addClass('section--collapsed');
        })
      },
      events: {
        "click .section__toggle": "toggle"
      },
      toggle: function (e) {
        console.log('Voi la!');
        var $section = $(e.target).closest('.section');
        var isCollapsed = $section.is('.section--collapsed');
        var index = this.$sections.index($section);
        var collapsed = _.clone(this.model.get('collapsed'));

        if (isCollapsed) {
          $section.removeClass('section--collapsed');
          collapsed[index] = 0;
        } else {
          $section.addClass('section--collapsed');
          collapsed[index] = 1;
        }
        this.model.set('collapsed', collapsed);

        $(document).trigger('section-toggle', this.model.get('id'));
      },
      $sections: null
    });

    var globalDefaults = {

    };

    function init (opts) {
      var settings = $.extend(globalDefaults, opts);

      var model = new SectionsModel(settings);
      var view = new SectionsView({model: model, el: settings.$element});

      return view;
    }

    return {
      init: init
    };
  })(jQuery)

  // global shortcuts
  window.sectionExpandCollapse = sectionExpandCollapse;
  
  return {
    'init' : function () {
      var self = this;
      var controller = Controller.init.apply(Controller, arguments);

      self.init = function(){return self}
      return self;
    },
    'Controller' : Controller,
    'Model' : {
      'StreamRow' : {
        'collection' : streamRowModels,
        'class' : StreamRowModel
      },
      'Stream' : {
        'collection' : streamModels,
        'class' : StreamModel
      }
    },
    'View' : {
      'StreamRow' : {
        'class' : StreamRowView
      },
      'Stream' : {
        'class' : StreamView
      }
    },
    sectionExpandCollapse : sectionExpandCollapse,
    confirmPopup: Controller.confirmPopup
  }
})(jQuery)

jQuery(document).bind('html_ready', function(){
  var app = FlowFlowApp.init();
  window.confirmPopup = app.Controller.confirmPopup;
});

function capitaliseFirstLetter (string)
{
  return string.charAt(0).toUpperCase() + string.slice(1);
}


function stripslashes (str) {
  str = str.replace(/\\'/g, '\'');
  str = str.replace(/\\"/g, '"');
  str = str.replace(/\\0/g, '\0');
  str = str.replace(/\\\\/g, '\\');
  return str;
}

function stripSlashesObjProps (obj) {
  for (var prop in obj) {
    if (typeof obj[prop] === 'string') obj[prop] = stripslashes(obj[prop]);
  }
  return obj
}

function unicodeToChar(text) {
  return text.replace(/\\u[\dA-F]{4}/gi,
      function (match) {
        return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16));
      });
}

// \u65e5\u672c\u4eba

// todo in next updates update stream status when error resolved in feed