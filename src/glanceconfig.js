/*jslint browser:true*/
/*globals glance*/
/* Copyright 2013 BlueMountain Capital */

(function () {
    "use strict";
    glance.page("", 'Dashboard', 'dashboard')
        .search("cpu");

    var cpu1 = new glance.metric("test.cpu", "demo"),
        cpu2 = new glance.metric("demo.cpu", "demo");
    cpu1.limits = [0,1];
    cpu2.limits = [0,1];
    glance.demo([
        cpu1,
        cpu2
    ]);
}());
