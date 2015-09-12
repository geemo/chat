var app = angular.module('chatApp', ['ngRoute']);

app.factory('socket', function($rootScope){
    var socket;
    return {
        connect: function(){
            socket = io.connect('http://127.0.0.1:3000', {'force new connection': true});
        },
        disconnect: function(){
            socket.disconnect();
        },
        emit: function(eventName, data, callback){
            if(socket){
                socket.emit(eventName, data, function(){
                    var args = arguments;
                    $rootScope.$apply(function(){
                        if(callback){
                            callback.apply(socket, args);
                        }
                    });
                });
            }
        },
        on: function(eventName, callback){
            if(socket){
                socket.on(eventName, function(){
                    var args = arguments;
                    $rootScope.$apply(function(){
                        callback.apply(socket, args);
                    });
                });
            }
        }
    };
});

app.directive('autoScrollToBottom', function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs){
            scope.$watch(
                function(){
                    return element.children().length;
                },
                function(){
                    element.prop('scrollTop', element.prop('scrollHeight'));
                });

            console.log(element);
        }
    };
});

app.directive('enterToSend', function(){
    return {
        restrict: 'A',
        link: function(scope, element, attrs){
            element.bind('keypress', function(event){
                if(event.which === 13){
                    scope.$apply(function(){
                        scope.$eval(attrs.enterToSend);
                    });
                    event.preventDefault();
                }
            });
        }
    };
});

app.controller('loginCtrl', function($scope, $http, $location, socket){
    $scope.login = function(){

        $http.post('/ajax/login', {userId: $scope.userId})
            .success(function(user){
                $scope.$emit('login', user);
                $location.path('/');

                //socket connect
                socket.connect();
                socket.emit('getUsersList');
            })
            .error(function(){
                $location.path('/login');
            });
    };
});

app.controller('roomCtrl', function($scope, socket){
    $scope.messages = [];
    $scope.users = [];
    $scope.remove = function(users, user){
        for(var i = 0; i < users.length; ++i){
            if(users[i] === user){
                users.splice(i, 1);
                return;
            }
        }
    };
    socket.on('userLogin', function(user){
        $scope.users.push(user);
    });

    socket.on('userLogout', function(user){
        $scope.remove($scope.users, user);
    });

    socket.on('addMessage', function(message){
        $scope.messages.push(message);
    });

    socket.on('addUsersList', function(users){
        $scope.users = users;
    });
});

app.controller('messageCreatorCtrl', function($scope, socket){
    $scope.messageContent = '';
    $scope.createMessage = function(){
        if($scope.messageContent === ''){
            return ;
        }

        socket.emit('messageCreate', {
            content: $scope.messageContent,
            creator: $scope.me
        });
        $scope.messageContent = '';
    };
});

app.config(function($routeProvider){
    $routeProvider.when('/', {
        templateUrl: 'pages/room.html',
        controller: 'roomCtrl'
    }).when('/login', {
        templateUrl: 'pages/login.html',
        controller: 'loginCtrl'
    }).otherwise({
        redirectTo: '/login'
    });
});

app.run(function($rootScope, $http, $location, socket){
    $rootScope.me = null;
    $http.get('/ajax/validate')
        .success(function(user){
            $rootScope.me = user;
            $location.path('/');


            socket.connect();
            socket.emit('getUsersList');
        })
        .error(function(data){
            $location.path('/login');
        });

    $rootScope.$on('login', function(event, user){
        $rootScope.me = user;
    });

    $rootScope.logout = function(){
        $http.get('/ajax/logout')
            .success(function(){
                $rootScope.me = null;
                $location.path('/login');

                //socket disconnect
                socket.disconnect();
            });
    };
});