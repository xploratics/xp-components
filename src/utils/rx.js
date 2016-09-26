Rx.Observable.prototype.$apply = function (scope, thisArg) {
    var self = this;
    return new Rx.AnonymousObservable(function (observer) {
        return self.subscribe(
            function (e) {
                scope.$apply(function () { observer.onNext(e); });
            },
            observer.onError.bind(observer),
            observer.onCompleted.bind(observer)
        );
    });
};