/* global angular, dhis2, art */

'use strict';

//Controller for settings page
artSummary.controller('HomeController',
        function($scope,
                $timeout,
                $translate,
                $modal,
                $filter,
                NotificationService,
                SessionStorageService,
                ArtService,
                ProgramFactory,
                MetaDataFactory,
                DateUtils,
                ExcelService,
                SelectedMenuService,
                OrgUnitFactory,
                CommonUtils) {

    $scope.model = {
        metaDataCached: false,
        menus: [],
        optionSets: null,
        trackedEntityAttributes: null,
        dataElementsById: null,
        selectedProgram: null,
        trackedEntityAccess: false,
        selectedStage: null,
        selectedEvent: null,
        events: [],
        programs: [],
        arts: [],
        art: {},
        artHeaders: [],
        summaryHeaders: [],
        showEditArt: false,
        showAddArt: false,
        showImportArt: false,
        editProfile: false,
        inputFile: null,
        excelData: null,
        excelRows: [],
        excelColumns: [],
        selectedSheet: null,
        parsingStarted: false,
        parsingFinished: true,
        columnObjectMap: {},
        cellValidity: [],
        sortHeader: null,
        recommendationDate: null,
        implementationDate: null
    };

    var start = new Date();
    dhis2.artSummary.downloadMetaData().then(function(){
        var end = new Date();

        SessionStorageService.set('METADATA_CACHED', true);
        console.log('Finished loading metadata in about ', (end - start) / 1000, ' - secs');
        $scope.model.menus.push({
            id: 'SRY',
            name: $translate.instant('summary'),
            view: 'components/home/summary.html'
        },{
            id: 'TRL',
            name: $translate.instant('status'),
            view: 'components/home/status.html'
        },{
            id: 'KPI',
            name: $translate.instant('kpis'),
            view: 'components/home/kpis.html'
        });

        $scope.model.selectedMenu = {
            id: 'SRY',
            name: $translate.instant('summary'),
            view: 'components/home/summary.html'
        };

        $scope.model.optionSets = [];
        MetaDataFactory.getAll('optionSets').then(function(optionSets){
            angular.forEach(optionSets, function(optionSet){
                $scope.model.optionSets[optionSet.id] = optionSet;
            });

            $scope.model.dataElementsById = [];
            MetaDataFactory.getAll('dataElements').then(function(des){
                angular.forEach(des, function(de){
                    $scope.model.dataElementsById[de.id] = de;
                });

                $scope.model.trackedEntityAttributes = [];
                MetaDataFactory.getAll('trackedEntityAttributes').then(function(teas){
                    angular.forEach(teas, function(tea){
                        $scope.model.trackedEntityAttributes[tea.id] = tea;
                    });

                    MetaDataFactory.getAll('programs').then(function(programs){
                        $scope.model.programs = programs;
                        $scope.model.metaDataCached = true;

                        //Get orgunits for the logged in user
                        OrgUnitFactory.getViewTreeRoot().then(function(response) {
                            $scope.orgUnits = response.organisationUnits;
                            angular.forEach($scope.orgUnits, function(ou){
                                ou.show = true;
                                angular.forEach(ou.children, function(o){
                                    o.hasChildren = o.children && o.children.length > 0 ? true : false;
                                });
                            });
                            $scope.selectedOrgUnit = $scope.orgUnits[0] ? $scope.orgUnits[0] : null;


                            $scope.model.summaryHeaders = [{
                                id: 'name',
                                displayName: $translate.instant('budget_institution')
                            },{
                                id: 'size',
                                displayName: $translate.instant('recommendation_count')
                            }];

                            $scope.model.sortHeader = {
                                id: 'name',
                                reverse: false
                            };
                        });
                    });
                });
            });
        });
    });

    $scope.setSelectedMenu = function( menu ){
        if( $scope.model.selectedMenu && $scope.model.selectedMenu.id === menu.id ){
            $scope.model.selectedMenu = null;
        }
        else{
            $scope.model.selectedMenu = menu;
        }

        SelectedMenuService.setSelectedMenu($scope.model.selectedMenu);
    };

    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {
        if( angular.isObject($scope.selectedOrgUnit)){
            SessionStorageService.set('SELECTED_OU', $scope.selectedOrgUnit);
            if ( !$scope.model.optionSets ){
                $scope.model.optionSets = [];
                MetaDataFactory.getAll('optionSets').then(function(optionSets){
                    angular.forEach(optionSets, function(optionSet){
                        $scope.model.optionSets[optionSet.id] = optionSet;
                    });

                    $scope.model.dataElementsById = [];
                    MetaDataFactory.getAll('dataElements').then(function(des){
                        angular.forEach(des, function(de){
                            $scope.model.dataElementsById[de.id] = de;
                        });

                        $scope.model.trackedEntityAttributes = [];
                        MetaDataFactory.getAll('trackedEntityAttributes').then(function(teas){
                            angular.forEach(teas, function(tea){
                                $scope.model.trackedEntityAttributes[tea.id] = tea;
                            });

                            MetaDataFactory.getAll('programs').then(function(programs){
                                $scope.model.programs = programs;
                            });
                        });
                    });
                });
            }
            else{
                $scope.loadPrograms($scope.selectedOrgUnit);
            }
        }
        else{
            $scope.reset();
        }
    });

    //watch for selection of program
    $scope.$watch('model.selectedProgram', function() {
        if( angular.isObject($scope.model.selectedProgram) && $scope.model.selectedProgram.id){
            $scope.loadProgramDetails();
        }
        else{
            $scope.reset();
        }
    });

    //load programs associated with the selected org unit.
    $scope.loadPrograms = function() {
        $scope.model.programs = [];
        $scope.model.trackedEntityAccess = false;
        $scope.model.selectedOptionSet = null;
        if (angular.isObject($scope.selectedOrgUnit)) {
            ProgramFactory.getByOu( $scope.selectedOrgUnit ).then(function(res){
                $scope.model.programs = res.programs || [];
                $scope.model.selectedProgram = res.selectedProgram || null;
            });
        }
    };

    //load details for selected program
    $scope.loadProgramDetails = function (){
        if( $scope.model.selectedProgram && $scope.model.selectedProgram.id ){
            $scope.model.voteColumn = {id: $scope.selectedOrgUnit.id, displayName: $translate.instant('vote_number')};
            $scope.model.artHeaders = [];
            $scope.filterText = {};
            $scope.model.programStageDataElements = null;
            $scope.model.trackedEntityAccess =  CommonUtils.userHasWriteAccess( 'ACCESSIBLE_TRACKEDENTITYTYPE', $scope.model.selectedProgram.trackedEntityType.id);


            angular.forEach($scope.model.selectedProgram.programTrackedEntityAttributes, function(pat){
                if( pat.trackedEntityAttribute && pat.trackedEntityAttribute.id ){
                    var tea = $scope.model.trackedEntityAttributes[pat.trackedEntityAttribute.id];
                    if( tea ){
                        tea.filterWithRange = false;
                        if ( tea.valueType === 'DATE' ||
                            tea.valueType === 'NUMBER' ||
                            tea.valueType === 'INTEGER' ||
                            tea.valueType === 'INTEGER_POSITIVE' ||
                            tea.valueType === 'INTEGER_NEGATIVE' ||
                            tea.valueType === 'INTEGER_ZERO_OR_POSITIVE' ){
                            tea.filterWithRange = true;
                            $scope.filterText[tea.id] = {};
                        }
                        tea.displayInList = pat.displayInList;
                        tea.mandatory = pat.mandatory;
                        tea.show = tea.displayInList;


                        $scope.model.artHeaders.push(tea);

                        if ( tea.recommendationDate ){
                            $scope.model.recommendationDate = tea;
                        }
                        else if( tea.implementationDate ){
                            $scope.model.implementationDate = tea;
                        }
                    }
                }
            });

            $scope.fetchRecommendations();
        }
    };

    //fetch recommendations for selected orgunit and program combination
    $scope.fetchRecommendations = function(){
        if( $scope.selectedOrgUnit && $scope.selectedOrgUnit.id && $scope.model.selectedProgram && $scope.model.selectedProgram.id ){
            ArtService.search($scope.model.selectedProgram, $scope.selectedOrgUnit, $scope.model.sortHeader, $scope.filterParam, $scope.model.trackedEntityAttributes, $scope.model.dataElementsById, $scope.model.optionSets).then(function(arts){
                $scope.model.arts = arts;
            });
        }
    };

    $scope.search = function(){

        $scope.filterParam = '';
        var filterExists = false;
        angular.forEach($scope.model.artHeaders, function(header){
            if ( $scope.filterText[header.id] ){
                if ( header.optionSetValue ){
                    if( $scope.filterText[header.id].length > 0  ){
                        var filters = $scope.filterText[header.id].map(function(filt) {return filt.code;});
                        if( filters.length > 0 ){
                            $scope.filterParam += '&filter=' + header.id + ':IN:' + filters.join(';');
                            filterExists = true;
                        }
                    }
                }
                else if ( header.filterWithRange ){
                    if( $scope.filterText[header.id].start && $scope.filterText[header.id].start !== "" || $scope.filterText[header.id].end && $scope.filterText[header.id].end !== ""){
                        $scope.filterParam += '&filter=' + header.id;
                        if( $scope.filterText[header.id].start ){
                            $scope.filterParam += ':GT:' + $scope.filterText[header.id].start;
                            filterExists = true;
                        }
                        if( $scope.filterText[header.id].end ){
                            $scope.filterParam += ':LT:' + $scope.filterText[header.id].end;
                            filterExists = true;
                        }
                    }
                }
                else{
                    $scope.filterParam += '&filter=' + header.id + ':like:' + $scope.filterText[header.id];
                    filterExists = true;
                }
            }
        });

        $scope.fetchRecommendations();

        /*if ( filterExists ){
            $scope.fetchRecommendations();
            $scope.model.displaySearchArt = false;
        }
        else{
            NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("search_param_empty") );
            return false;
        }*/
    };

    $scope.setSortHeader = function( header ){
        if ( header.id === $scope.model.sortHeader.id ){
            $scope.model.sortHeader.reverse = !$scope.model.sortHeader.reverse;
        }
        else{
            $scope.model.sortHeader = {
                id: header.id,
                reverse: false
            };
        }

        $scope.reverse = ($scope.model.sortHeader && $scope.model.sortHeader.id === header.id) ? !$scope.reverse : false;
    };

    $scope.removeStartFilterText = function(gridColumnId){
        $scope.filterText[gridColumnId].start = undefined;
    };

    $scope.removeEndFilterText = function(gridColumnId){
        $scope.filterText[gridColumnId].end = undefined;
    };

    $scope.resetFilter = function(){
        $scope.filterText = angular.copy($scope.emptyFilterText);
        $scope.filterArts(null, true);
    };

    $scope.isOnAddEditMode = function(){
        return $scope.model.displayAddArt || $scope.model.displaImportArt || $scope.model.displayEditArt;
    };

    $scope.interacted = function(field) {
        var status = false;
        if(field){
            status = $scope.outerForm.submitted || field.$dirty;
        }
        return status;
    };

    $scope.cancelSearch = function(){
        $scope.model.displaySearchArt = false;
        $scope.filterParam = '';
        $scope.fetchRecommendations();
    };

    $scope.reset= function(){
        $scope.model.selectedProgram = null;
        $scope.model.artHeaders = [];
        $scope.model.arts = [];
        $scope.model.art = {};
    };

    /*$scope.sortItems = function( header ){
        $scope.reverse = ($scope.model.sortHeader && $scope.model.sortHeader.id === header.id) ? !$scope.reverse : false;
        var direction = 'asc';
        if ( $scope.model.sortHeader.id === header.id ){
            if ( $scope.model.sortHeader.direction === direction ){
                direction = 'desc';
            }
        }
        $scope.model.sortHeader = {id: header.id, direction: direction};
        $scope.fetchRecommendations();
    };*/

    $scope.showOrgUnitTree = function(){
        var modalInstance = $modal.open({
            templateUrl: 'components/outree/orgunit-tree.html',
            controller: 'OuTreeController',
            resolve: {
                orgUnits: function(){
                    return $scope.orgUnits;
                },
                selectedOrgUnit: function(){
                    return $scope.selectedOrgUnit;
                },
                validOrgUnits: function(){
                    return null;
                }
            }
        });

        modalInstance.result.then(function ( selectedOu ) {
            if( selectedOu && selectedOu.id ){
                $scope.selectedOrgUnit = selectedOu;
                $scope.resetDataView();
            }
        });
    };

    $scope.showHideColumns = function(){
        var modalInstance = $modal.open({
            templateUrl: 'views/column-modal.html',
            controller: 'ColumnDisplayController',
            resolve: {
                gridColumns: function () {
                    return $scope.model.artHeaders;
                },
                hiddenGridColumns: function(){
                    return ($filter('filter')($scope.model.artHeaders, {show: false})).length;
                }
            }
        });

        modalInstance.result.then(function (gridColumns) {
            $scope.model.artHeaders = gridColumns;
        });
    };

    $scope.exportData = function ( name ) {
        var blob = new Blob([document.getElementById('exportTable').innerHTML], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=utf-8"
        });

        var reportName = "recommendation-list.xls";
        if( name ){
            reportName = name + '.xls';
        }
        saveAs(blob, reportName);
    };
});
