/**
 * Created by Administrator on 2019/2/14.
 */
var editModule = angular.module('Angular.edit');


// overallModule.directive('convertToNumber', ['$parse', function ($parse) {
//     return {
//         restrict: 'A',
//         require: 'ngModel',
//         link: function (scope, element, attrs, ngModel) {
//             ngModel.$parsers.push(function (val) {
//                 return val != null ? parseInt(val, 10) : null;
//             });
//             ngModel.$formatters.push(function (val) {
//                 return val != null ? '' + val : null;
//             });
//         }
//     };
// }]);