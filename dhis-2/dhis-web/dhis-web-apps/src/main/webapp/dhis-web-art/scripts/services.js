/* global angular, moment, dhis2, parseFloat */

'use strict';

/* Services */

var artServices = angular.module('artServices', ['ngResource'])

.factory('D2StorageService', function(){
    var store = new dhis2.storage.Store({
        name: "dhis2art",
        adapters: [dhis2.storage.IndexedDBAdapter, dhis2.storage.DomSessionStorageAdapter, dhis2.storage.InMemoryAdapter],
        objectStores: ['programs', 'optionSets', 'trackedEntityAttributes', 'attributes', 'dataElements', 'ouLevels']
    });
    return{
        currentStore: store
    };
})

.service('PeriodService', function(CalendarService){

    this.getPeriods = function(periodType, periodOffset, futurePeriods){
        if(!periodType){
            return [];
        }

        var calendarSetting = CalendarService.getSetting();

        dhis2.period.format = calendarSetting.keyDateFormat;

        dhis2.period.calendar = $.calendars.instance( calendarSetting.keyCalendar );

        dhis2.period.generator = new dhis2.period.PeriodGenerator( dhis2.period.calendar, dhis2.period.format );

        dhis2.period.picker = new dhis2.period.DatePicker( dhis2.period.calendar, dhis2.period.format );

        var d2Periods = dhis2.period.generator.generateReversedPeriods( periodType, periodOffset );

        d2Periods = dhis2.period.generator.filterOpenPeriods( periodType, d2Periods, futurePeriods, null, null );

        angular.forEach(d2Periods, function(p){
            //p.endDate = DateUtils.formatFromApiToUser(p.endDate);
            //p.startDate = DateUtils.formatFromApiToUser(p.startDate);
            p.displayName = p.name;
            p.id = p.iso;
        });

        return d2Periods;
    };
})

/* Factory to fetch optionSets */
.factory('OptionSetService', function($q, $rootScope, D2StorageService) {
    return {
        getAll: function(){

            var def = $q.defer();

            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.getAll('optionSets').done(function(optionSets){
                    $rootScope.$apply(function(){
                        def.resolve(optionSets);
                    });
                });
            });

            return def.promise;
        },
        get: function(uid){
            var def = $q.defer();

            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.get('optionSets', uid).done(function(optionSet){
                    $rootScope.$apply(function(){
                        def.resolve(optionSet);
                    });
                });
            });
            return def.promise;
        },
        getCode: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].displayName){
                        return options[i].code;
                    }
                }
            }
            return key;
        },
        getName: function(options, key){
            if(options){
                for(var i=0; i<options.length; i++){
                    if( key === options[i].code){
                        return options[i].displayName;
                    }
                }
            }
            return key;
        }
    };
})


/* Factory to fetch programs */
.factory('ProgramFactory', function($q, $rootScope, D2StorageService, CommonUtils, orderByFilter) {

    return {
        get: function(uid){

            var def = $q.defer();

            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.get('programs', uid).done(function(ds){
                    $rootScope.$apply(function(){
                        def.resolve(ds);
                    });
                });
            });
            return def.promise;
        },
        getByOu: function(ou, selectedProgram){
            var def = $q.defer();

            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.getAll('programs').done(function(prs){
                    var programs = [];
                    angular.forEach(prs, function(pr){
                        if(pr.organisationUnits.hasOwnProperty( ou.id ) && pr.id && CommonUtils.userHasWriteAccess( 'ACCESSIBLE_PROGRAMS', pr.id)){
                            programs.push(pr);
                        }
                    });

                    programs = orderByFilter(programs, '-displayName').reverse();

                    if(programs.length === 0){
                        selectedProgram = null;
                    }
                    else if(programs.length === 1){
                        selectedProgram = programs[0];
                    }
                    else{
                        if(selectedProgram){
                            var continueLoop = true;
                            for(var i=0; i<programs.length && continueLoop; i++){
                                if(programs[i].id === selectedProgram.id){
                                    selectedProgram = programs[i];
                                    continueLoop = false;
                                }
                            }
                            if(continueLoop){
                                selectedProgram = null;
                            }
                        }
                    }

                    if(!selectedProgram || angular.isUndefined(selectedProgram) && programs.legth > 0){
                        selectedProgram = programs[0];
                    }

                    $rootScope.$apply(function(){
                        def.resolve({programs: programs, selectedProgram: selectedProgram});
                    });
                });
            });
            return def.promise;
        }
    };
})


/* factory to fetch and process programValidations */
.factory('MetaDataFactory', function($q, $rootScope, D2StorageService, orderByFilter) {

    return {
        get: function(store, uid){
            var def = $q.defer();
            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.get(store, uid).done(function(obj){
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });
            return def.promise;
        },
        set: function(store, obj){
            var def = $q.defer();
            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.set(store, obj).done(function(obj){
                    $rootScope.$apply(function(){
                        def.resolve(obj);
                    });
                });
            });
            return def.promise;
        },
        getAll: function(store){
            var def = $q.defer();
            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.getAll(store).done(function(objs){
                    objs = orderByFilter(objs, '-displayName').reverse();
                    $rootScope.$apply(function(){
                        def.resolve(objs);
                    });
                });
            });
            return def.promise;
        },
        getByProperty: function(store, prop, val){
            var def = $q.defer();
            D2StorageService.currentStore.open().done(function(){
                D2StorageService.currentStore.getAll(store).done(function(objs){
                    var selectedObject = null;
                    for(var i=0; i<objs.length; i++){
                        if(objs[i][prop] ){
                            objs[i][prop] = objs[i][prop].toLocaleLowerCase();
                            if( objs[i][prop] === val )
                            {
                                selectedObject = objs[i];
                                break;
                            }
                        }
                    }

                    $rootScope.$apply(function(){
                        def.resolve(selectedObject);
                    });
                });
            });
            return def.promise;
        }
    };
})

/* service for handling events */
.service('ArtService', function($http, DHIS2URL, CommonUtils, DateUtils) {

    return {
        get: function(uid){
            var promise = $http.get(DHIS2URL + '/trackedEntityInstances/' + uid + '.json').then(function (response) {
                return response.data;
            } ,function(error) {
                return null;
            });
            return promise;
        },
        getByProgramAndOu: function( program, orgUnit, attributesById, dataElementsById, optionSetsById ){
            var promise;
            if( program.id && orgUnit.id ){
                promise = $http.get(DHIS2URL + '/trackedEntityInstances.json?fields=*&order=created:desc&pageSize=50&page=1&totalPages=false&ouMode=SELECTED&ou=' + orgUnit.id + '&program=' + program.id).then(function (response) {
                    var arts = [];
                    var teis = response.data && response.data.trackedEntityInstances ? response.data.trackedEntityInstances : [];
                    angular.forEach(teis, function(tei){
                        tei.attributeValues = {};
                        tei.recommendationStatus = {};
                        angular.forEach(tei.attributes, function(atv){
                            var val = atv.value;
                            var att = attributesById[atv.attribute];
                            if( att && att.optionSetValue ){
                                val = CommonUtils.formatDataValue(null, val, att, optionSetsById, 'USER');
                            }

                            tei.attributeValues[atv.attribute] = val;
                        });
                        if ( tei.enrollments.length === 1 ){
                            tei.enrollment = tei.enrollments[0].enrollment;
                            tei.enrollmentDate = DateUtils.formatFromApiToUser(tei.enrollments[0].enrollmentDate);
                            var events = tei.enrollments[0].events;
                            if ( events.length > 0 ){
                                angular.forEach(events, function(ev){
                                    ev.values = {};
                                    ev.eventDate = DateUtils.formatFromApiToUser(ev.eventDate);
                                    angular.forEach(ev.dataValues, function(dv){
                                        var val = dv.value;
                                        var de = attributesById[dv.dataElement];
                                        if( de && de.optionSetValue ){
                                            val = CommonUtils.formatDataValue(ev, val, de, optionSetsById, 'USER');
                                        }
                                        ev.values[dv.dataElement] = val;
                                    })
                                    if( !tei.recommendationStatus[ev.programStage] ){
                                        tei.recommendationStatus[ev.programStage] = ev;
                                    }
                                    else{
                                        tei.recommendationStatus[ev.programStage] = 'invalid';
                                    }
                                });
                            }
                        }
                        else{
                           tei.invalidEnrollment = tei.enrollments.length > 1;
                        }
                        arts.push( tei );

                        delete tei.attributes;
                    });

                    return arts;
                } ,function(error) {
                    return null;
                });
            }
            return promise;
        },
        add: function( art ){
            var promise = $http.post(DHIS2URL + '/trackedEntityInstances.json?strategy=SYNC', art).then(function (response) {
                return response.data;
            } ,function(error) {
                return error.data;
            });
            return promise;
        },
        update: function( art, programId ){
            var programFilter = programId ? "?program=" + programId : "";
            var promise = $http.put(DHIS2URL + '/trackedEntityInstances/' + art.trackedEntityInstance + programFilter, art).then(function (response) {
                return response.data;
            } ,function(error) {
                return error.data;
            });
            return promise;
        }
    };
})

/* Service for uploading/downloading file */
.service('FileService', function ($http, DHIS2URL) {

    return {
        get: function (uid) {
            var promise = $http.get(DHIS2URL + '/fileResources/' + uid).then(function (response) {
                return response.data;
            } ,function(error) {
                return null;
            });
            return promise;
        },
        download: function (fileName) {
            var promise = $http.get(fileName).then(function (response) {
                return response.data;
            }, function(error) {
                return null;
            });
            return promise;
        },
        upload: function(file){
            var formData = new FormData();
            formData.append('file', file);
            var headers = {transformRequest: angular.identity, headers: {'Content-Type': undefined}};
            var promise = $http.post(DHIS2URL + '/fileResources', formData, headers).then(function(response){
                return response.data;
            },function(error) {
               return null;
            });
            return promise;
        }
    };
})

.service('OrgUnitService', function($http){
    var orgUnit, orgUnitPromise;
    return {
        get: function( uid, level ){
            if( orgUnit !== uid ){
                orgUnitPromise = $http.get( '../api/organisationUnits.json?filter=path:like:/' + uid + '&filter=level:le:' + level + '&fields=id,displayName,path,level,parent[id]&paging=false' ).then(function(response){
                    orgUnit = response.data.id;
                    return response.data;
                });
            }
            return orgUnitPromise;
        }
    };
})

.service('ExcelService', function($q, $rootScope){
    return {
        load: function(file){

            var promise = $q(function(resolve, reject) {
                var reader = new FileReader();
                reader.onload = function (e) {
                    var data = reader.result;
                    console.log('the data:  ', data);
                    var workbook = XLSX.read(data, {
                        type: 'binary'
                    });
                    var sheetNames = workbook.SheetNames;
                    var worksheet = workbook.Sheets[sheetNames[0]];
                    var workbook = XLSX.utils.sheet_to_json(worksheet);
                    resolve(workbook);
                };
                reader.onerror = function (ex) {
                    reject(ex);
                };
                reader.readAsArrayBuffer(file);
            });
            return promise;

            /*var def = $q.defer();
            XLSXReader(file, true, true, function(data) {
                $rootScope.$apply(function() {
                    def.resolve(data);
                });
            });

            return def.promise;*/
        },
        parse: function( workbook, sheet ){
            /*var xlsReader = function( file ){
                return new Promise((resolve, reject) => {
                    var reader = new FileReader();
                    reader.onload = res => {
                        var data = res.target.result;
                        var workbook = XLSX.read(data, {type: 'binary'});
                        var parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                        resolve(parsedData);
                    };
                    reader.onerror = err => reject(err);

                    reader.readAsBinaryString(file);
                });
            };

            var promise = xlsReader( file );
            promise.then(function( result ){
                return result;
            });
            return promise;*/
            console.log('workbook:  ', workbook);
            console.log('sheets:  ', sheet);
            return XLSX.utils.sheet_to_json(workbook.Sheets[sheet], {raw: true, defval:null});
        },
        load: function( file ){

            var xlsReader = function( file ){
                return new Promise((resolve, reject) => {
                    var reader = new FileReader();
                    reader.onload = res => {
                        var data = res.target.result;
                        var workbook = XLSX.read(data, {type: 'binary'});
                        //var parsedData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
                        //resolve(parsedData);
                        resolve( workbook );
                    };
                    reader.onerror = err => reject(err);

                    reader.readAsBinaryString(file);
                });
            };

            var promise = xlsReader( file );
            promise.then(function( result ){
                return result;
            });
            return promise;
        }
    };
})

/*Orgunit service for local db */
.service('IndexDBService', function($window, $q){

    var indexedDB = $window.indexedDB;
    var db = null;

    var open = function( dbName ){
        var deferred = $q.defer();

        var request = indexedDB.open( dbName );

        request.onsuccess = function(e) {
          db = e.target.result;
          deferred.resolve();
        };

        request.onerror = function(){
          deferred.reject();
        };

        return deferred.promise;
    };

    var get = function(storeName, uid){

        var deferred = $q.defer();

        if( db === null){
            deferred.reject("DB not opened");
        }
        else{
            var tx = db.transaction([storeName]);
            var store = tx.objectStore(storeName);
            var query = store.get(uid);

            query.onsuccess = function(e){
                deferred.resolve(e.target.result);
            };
        }
        return deferred.promise;
    };

    return {
        open: open,
        get: get
    };
});