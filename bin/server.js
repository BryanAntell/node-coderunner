// Generated by CoffeeScript 1.10.0
(function() {
  'use strict';
  var Hapi, MAX_PAYLOAD_BYTES, Server, badRequest, createReqPayload, isTruthy, join, localReply, ref;

  Hapi = require('hapi');

  badRequest = require('boom').badRequest;

  join = require('path').join;

  ref = require('./remote_payload'), isTruthy = ref.isTruthy, createReqPayload = ref.create;

  localReply = require('./local_reply');

  MAX_PAYLOAD_BYTES = 20000000;

  Server = (function() {
    function Server() {
      this.server = new Hapi.Server();
      this.server.connection({
        host: '0.0.0.0',
        port: process.env.PORT || 4545
      });
      this.server.on('request-error', function(req, err) {
        return console.log('Internal Server Error:', err);
      });
    }

    Server.prototype._names = function() {
      return this.server.route({
        method: 'GET',
        path: '/names',
        handler: (function(_this) {
          return function(req, reply) {
            if (!_this.snippetNames) {
              return reply(badRequest('Server Has not been started!'));
            }
            return reply(_this.snippetNames);
          };
        })(this)
      });
    };


    /*
    The required path is relative to this module...
     */

    Server.prototype._configure = function(context, path) {
      this.requiredFile = context.require(path);
      this.snippetNames = Object.keys(this.requiredFile);
      return this._setupRoutes();
    };


    /*
    We need local testing to behave the same as when the code is deployed on the PaaS but
    normally coderunner does a bunch of work as the middleman. We recreate a lot of that logic
    here and flip the local switch via an environment variable.
     */

    Server.prototype._setupRoutes = function() {
      this._names();
      if (isTruthy(process.env['CLOUDMINE'])) {
        return this._setupDeployedRoutes();
      } else {
        return this._setupLocalTestingRoutes();
      }
    };

    Server.prototype._setupLocalTestingRoutes = function() {
      var SNIPPET_TIMEOUT, i, j, len, len1, localTestingHandler, path, paths, results;
      paths = ['/v1/app/{appid}/run/{name}', '/v1/app/{appid}/user/run/{name}', '/v1/app/{appid}/user/{userId}/run/{name}'];
      localTestingHandler = (function(_this) {
        return function(original_req, reply) {
          var req, snippet;
          snippet = _this.requiredFile[original_req.params.name];
          if (!snippet) {
            return reply(badRequest('Snippet Not Found!'));
          }
          req = createReqPayload(original_req);
          return snippet(req, localReply(reply, isTruthy(original_req.query.unwrap_result)));
        };
      })(this);
      SNIPPET_TIMEOUT = 30000;
      for (i = 0, len = paths.length; i < len; i++) {
        path = paths[i];
        this._setupPutAndPostRoute(path, localTestingHandler, SNIPPET_TIMEOUT);
      }
      results = [];
      for (j = 0, len1 = paths.length; j < len1; j++) {
        path = paths[j];
        results.push(this._setupGetRoute(path, localTestingHandler, SNIPPET_TIMEOUT));
      }
      return results;
    };

    Server.prototype._setupDeployedRoutes = function() {
      var deployedHandler, path;
      path = '/code/{name}';
      deployedHandler = (function(_this) {
        return function(req, reply) {
          var snippet;
          snippet = _this.requiredFile[req.params.name];
          if (!snippet) {
            return reply(badRequest('Snippet Not Found!'));
          }
          return snippet(req, reply);
        };
      })(this);
      this._setupPutAndPostRoute(path, deployedHandler);
      return this._setupGetRoute(path, deployedHandler);
    };

    Server.prototype._setupPutAndPostRoute = function(path, handler, timeout) {
      return this.server.route({
        method: ['PUT', 'POST'],
        path: path,
        config: {
          payload: {
            maxBytes: MAX_PAYLOAD_BYTES
          },
          timeout: {
            server: timeout || null
          }
        },
        handler: handler
      });
    };

    Server.prototype._setupGetRoute = function(path, handler, timeout) {
      return this.server.route({
        method: ['GET', 'DELETE'],
        path: path,
        handler: handler,
        config: {
          timeout: {
            server: timeout || null
          }
        }
      });
    };

    Server.prototype.start = function(context, path, cb) {
      if (!path) {
        throw Error('No Path Given!');
      }
      this._configure(context, path);
      return this.server.start(function(err) {
        if (cb) {
          return cb(err);
        }
      });
    };

    return Server;

  })();

  module.exports = new Server();

}).call(this);
