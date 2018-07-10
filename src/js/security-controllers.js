/*******************************************************************************
 * Copyright (c) 2013-2015 Sierra Wireless and others.
 *
 * All rights reserved. This program and the accompanying materials
 * are made available under the terms of the Eclipse Public License v1.0
 * and Eclipse Distribution License v1.0 which accompany this distribution.
 *
 * The Eclipse Public License is available at
 *    http://www.eclipse.org/legal/epl-v10.html
 * and the Eclipse Distribution License is available at
 *    http://www.eclipse.org/org/documents/edl-v10.html.
 *
 * Contributors:
 *     Sierra Wireless - initial API and implementation
 *******************************************************************************/

angular.module('securityControllers', [])

.controller('SecurityCtrl', [
    '$scope',
    '$http',
    'dialog',
    function SecurityCtrl($scope, $http, dialog) {

        // update navbar
        angular.element("#navbar").children().removeClass('active');
        angular.element("#security-navlink").addClass('active');

        // get the list of security info by end-point
        var leshan = cockpit.http(8080);

        leshan.get('/api/security/clients').fail(function(response, data) {
            $scope.$apply(function(){
                $scope.error = "Unable to get the clients security info list: " + response.status + " " + data;
                console.error($scope.error);
            });
        }).done(function(data) {
            $scope.$apply(function(){
                data = angular.fromJson(data);
                $scope.securityInfos = {};
                for (var i = 0; i < data.length; i++) {
                    $scope.securityInfos[data[i].endpoint] = data[i];
                }
            });
        });

        leshan.get('/api/security/server').fail(function(response, data){
            $scope.$apply(function(){
                $scope.error = "Unable to get the server security info list: " + response.status + " " + data;
                console.error($scope.error);
            });
        }).done(function(data) {
            $scope.$apply(function(){
                $scope.serverSecurityInfo = angular.fromJson(data);
            });
        });

        $scope.remove = function(endpoint) {
            leshan.request({method: 'DELETE', path: "/api/security/clients/" + endpoint, body:{}, headers:{'Content-Type': 'application/json'}})
            .done(function(data) {
                $scope.$apply(function(){
                    delete $scope.securityInfos[endpoint];
                });
           }).fail(function(response, data){
               $scope.$apply(function(){
                   errormessage = "Unable to remove security info for endpoint " + endpoint + ": " + response.status + " - " + data;
                   dialog.open(errormessage);
                   console.error(errormessage);
               });
            });
        };

        $scope.save = function() {
            $scope.$broadcast('show-errors-check-validity');
            if ($scope.form.$valid) {
                if($scope.securityMode == "psk") {
                    var security = {endpoint: $scope.endpoint, psk : { identity : $scope.pskIdentity , key : $scope.pskValue}};
                } else if($scope.securityMode == "rpk") {
                    var security = {endpoint: $scope.endpoint, rpk : { x : $scope.rpkXValue , y : $scope.rpkYValue, params : $scope.rpkParamsValue || $scope.defaultParams}};
                } else {
                    var security = {endpoint: $scope.endpoint, x509 : true};
                }
                if(security) {
                    leshan.request({method: 'PUT', path: "/api/security/clients/", body: JSON.stringify(security), headers:{'Content-Type': 'application/json'}})
                    .done(function(data) {
                        $scope.$apply(function() {
                            $scope.securityInfos[$scope.endpoint] = security;
                            $('#newSecurityModal').modal('hide');
                        });
                    }).fail(function(response, data) {
                        $scope.$apply(function(){
                            errormessage = "Unable to add security info for endpoint " + $scope.endpoint + ": " + response.status + " - " + data;
                            dialog.open(errormessage);
                            console.error(errormessage);
                        });
                    });
                }
            }
        };

        $scope.showModal = function() {
            $('#newSecurityModal').modal('show');
            $scope.$broadcast('show-errors-reset');
            $scope.endpoint = '';
            $scope.securityMode = 'psk';
            $scope.pskIdentity = '';
            $scope.pskValue = '';
            $scope.rpkXValue = '';
            $scope.rpkYValue = '';
            $scope.defaultParams = 'secp256r1';
       };
}])


/* directive to toggle error class on input fields */
.directive('showErrors', function($timeout) {
    return {
        restrict : 'A',
        require : '^form',
        link : function(scope, el, attrs, formCtrl) {
            // find the text box element, which has the 'name' attribute
            var inputEl = el[0].querySelector("[name]");
            // convert the native text box element to an angular element
            var inputNgEl = angular.element(inputEl);
            // get the name on the text box
            var inputName = inputNgEl.attr('name');

            // only apply the has-error class after the user leaves the text box
            inputNgEl.bind('blur', function() {
                el.toggleClass('has-error', formCtrl[inputName].$invalid);
            });

            scope.$on('show-errors-check-validity', function() {
                el.toggleClass('has-error', formCtrl[inputName].$invalid);
            });

            scope.$on('show-errors-reset', function() {
                $timeout(function() {
                    el.removeClass('has-error');
                }, 0, false);
            });
        }
    };
});
