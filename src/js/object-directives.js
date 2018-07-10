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

angular.module('objectDirectives', [])

.directive('object', function ($compile, $routeParams, $http, dialog, $filter, $modal, lwResources, helper) {
    return {
        restrict: "E",
        replace: true,
        scope: {
            object: '=',
            settings: '='
        },
        templateUrl: "partials/object.html",
        link: function (scope, element, attrs) {
            var parentPath = "";
            scope.status = {};
            scope.status.open = true;

            scope.object.path = parentPath + "/" + scope.object.id;
            scope.object.create  =  {tooltip : "Create <br/>"   + scope.object.path};

            var leshan = cockpit.http(8080);

            scope.create = function () {
                var modalInstance = $modal.open({
                  templateUrl: 'partials/modal-instance.html',
                  controller: 'modalInstanceController',
                  resolve: {
                    object: function(){ return scope.object;},
                    instanceId: function(){ return null;},
                  }
                });

                modalInstance.result.then(function (instance) {
                    // Build payload
                    var payload = {};
                    payload["id"] = instance.id;
                    payload["resources"] = [];

                    for(i in instance.resources){
                        var resource = instance.resources[i];
                        if (resource.value != undefined){
                            payload.resources.push({
                                id:resource.id,
                                value:lwResources.getTypedValue(resource.value, resource.def.type)
                            });
                        }
                    }
                    // Send request
                    var format = scope.settings.multi.format;
                    var instancepath  = scope.object.path;
                    var uri = "/api/clients/" + $routeParams.clientId + instancepath + "?format="+format;

                    leshan.post(uri, payload).fail(function (response, data) {
                        errormessage = "Unable to create instance " + instancepath + " for "+ $routeParams.clientId + " : " + response.status +" "+ data;
                        dialog.open(errormessage);
                        console.error(errormessage);
                    }).done(function (data) {
                        scope.$apply(function() {
                            data = angular.fromJson(data);
                            helper.handleResponse(data, scope.object.create, function (formattedDate) {
                                if (data.success) {
                                    var newinstance = lwResources.addInstance(scope.object, instance.id, null);
                                    for (var i in payload.resources) {
                                        var tlvresource = payload.resources[i];
                                        resource = lwResources.addResource(scope.object, newinstance, tlvresource.id, null);
                                        resource.value = tlvresource.value;
                                        resource.valuesupposed = true;
                                        resource.tooltip = formattedDate;
                                    }
                                }
                            });
                        });
                    });
                });
            };
        }
    };
});
