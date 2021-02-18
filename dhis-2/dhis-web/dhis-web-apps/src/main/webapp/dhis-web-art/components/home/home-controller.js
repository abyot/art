/* global angular, dhis2, art */

'use strict';

//Controller for settings page
art.controller('HomeController',
        function($scope,
                $timeout,
                $translate,
                NotificationService,
                SessionStorageService,
                ArtService,
                ProgramFactory,
                MetaDataFactory,
                DateUtils,
                ExcelService,
                CommonUtils) {

    $scope.model = {
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

    //watch for selection of org unit from tree
    $scope.$watch('selectedOrgUnit', function() {
        if( angular.isObject($scope.selectedOrgUnit)){
            $scope.cancelEdit();
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
                                if ( tea.recommendationDate ){
                                    $scope.model.recommendationDate = tea;
                                    $scope.model.sortHeader = {id: tea.id, direction: 'desc'};
                                }
                                $scope.model.trackedEntityAttributes[tea.id] = tea;
                            });

                            $scope.loadPrograms($scope.selectedOrgUnit);
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

    $scope.$watch('model.inputFile', function(){
        $scope.model.excelData = null;
        $scope.model.excelRows = [];
        $scope.model.excelColumns = [];
        if( angular.isObject($scope.model.inputFile) && $scope.model.inputFile[0]){
            ExcelService.load($scope.model.inputFile[0]).then(function(result) {
                $scope.model.excelData = result;
                $scope.$apply(function(){});
            });
        }
    });

    $scope.$watch('model.selectedSheet', function() {
        if( $scope.model.selectedSheet ){
            $scope.model.parsingStarted = true;
            $scope.model.parsingFinished = false;
            $scope.model.excelRows = [];
            $scope.model.excelColumns = [];

            $timeout(function() {
                var result = ExcelService.parse( $scope.model.excelData, $scope.model.selectedSheet);
                $scope.model.excelRows = result;
                $scope.model.parsingStarted = false;
                $scope.model.parsingFinished = true;

                if ( $scope.model.excelRows[0] ) {
                    Object.keys( $scope.model.excelRows[0] ).forEach( k => {
                        if( k !== '__EMPTY'){
                            $scope.model.excelColumns.push({
                                displayName: k
                            });
                        }
                    });
                }

            }, 10);
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
            $scope.model.programStageDataElements = null;
            $scope.model.trackedEntityAccess =  CommonUtils.userHasWriteAccess( 'ACCESSIBLE_TRACKEDENTITYTYPE', $scope.model.selectedProgram.trackedEntityType.id);
            angular.forEach($scope.model.selectedProgram.programTrackedEntityAttributes, function(pat){
                if( pat.trackedEntityAttribute && pat.trackedEntityAttribute.id ){
                    var tea = $scope.model.trackedEntityAttributes[pat.trackedEntityAttribute.id];
                    if( tea ){
                        tea.displayInList = pat.displayInList;
                        $scope.model.artHeaders.push(tea);
                    }
                }
            });
            $scope.fetchRecommendations($scope.model.sortHeader);
        }
    };

    //fetch recommendations for selected orgunit and program combination
    $scope.fetchRecommendations = function( sortHeader ){
        if( $scope.selectedOrgUnit && $scope.selectedOrgUnit.id && $scope.model.selectedProgram && $scope.model.selectedProgram.id ){
            ArtService.getByProgramAndOu($scope.model.selectedProgram, $scope.selectedOrgUnit, sortHeader, $scope.model.trackedEntityAttributes, $scope.model.dataElementsById, $scope.model.optionSets).then(function(teis){
                $scope.model.arts = teis;
            });
        }
    };

    $scope.showAddArt = function(){
        $scope.model.displayAddArt = true;
    };

    $scope.addArt = function(){
        //check for form validity
        $scope.outerForm.submitted = true;
        if( $scope.outerForm.$invalid ){
            return false;
        }

        var tei = {
            trackedEntityType: $scope.model.selectedProgram.trackedEntityType.id,
            orgUnit: $scope.selectedOrgUnit.id,
            enrollments: [
                {
                    program: $scope.model.selectedProgram.id,
                    enrollmentDate: DateUtils.formatFromUserToApi(DateUtils.getToday()),
                    orgUnit: $scope.selectedOrgUnit.id,
                    trackedEntityType: $scope.model.selectedProgram.trackedEntityType.id
                }
            ],
            attributes: []
        };

        var art = {attributeValues: {}};
        angular.forEach($scope.model.selectedProgram.programTrackedEntityAttributes, function(pat){
            var value = $scope.model.art[pat.trackedEntityAttribute.id];
            var tea = $scope.model.trackedEntityAttributes[pat.trackedEntityAttribute.id];
            value = CommonUtils.formatDataValue(null, value, tea, $scope.model.optionSets, 'API');

            if ( tea.optionSetValue ){
                var optionSet = $scope.model.optionSets[tea.optionSet.id];
                if ( optionSet && optionSet.isTrafficLight ){
                    art.trafficLight = value;
                }
            }

            if ( value ){
                art.attributeValues[pat.trackedEntityAttribute.id] = $scope.model.art[pat.trackedEntityAttribute.id];
                tei.attributes.push({
                    attribute: tea.id,
                    value: value
                });
            }
        });

        ArtService.add(tei).then(function(data){
            if( data.response.importSummaries[0].status==='ERROR' ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("art_add_failed") + data.response.importSummaries[0] );
                return;
            }
            else{
                $scope.model.arts.splice(0,0,art);
            }
            $scope.cancelEdit();
        });
    };

    $scope.showEditArt = function(art){
        $scope.model.displayEditArt = true;
        $scope.model.art = angular.copy(art);
        $scope.model.originalArt = angular.copy(art);
        if ( $scope.model.selectedProgram.programStages && $scope.model.selectedProgram.programStages.length > 0 ){
            $scope.model.selectedStage = $scope.model.selectedProgram.programStages[0];
            $scope.model.selectedEvent = angular.copy($scope.model.art.recommendationStatus[$scope.model.selectedStage.id]);
            $scope.model.originalEvent = angular.copy($scope.model.art.recommendationStatus[$scope.model.selectedStage.id]);
            console.log('selected event:  ', $scope.model.selectedEvent);
        }
    };

    $scope.updateArt = function(){
        //check for form validity
        $scope.outerForm.submitted = true;
        if( $scope.outerForm.$invalid ){
            return false;
        }

        var tei = {
            trackedEntityType: $scope.model.art.trackedEntityType,
            trackedEntityInstance: $scope.model.art.trackedEntityInstance,
            orgUnit: $scope.model.art.orgUnit,
            enrollments: [
                {
                    enrollment: $scope.model.art.enrollment,
                    program: $scope.model.selectedProgram.id,
                    enrollmentDate: DateUtils.formatFromUserToApi($scope.model.art.enrollmentDate),
                    orgUnit: $scope.selectedOrgUnit.id,
                    trackedEntityType: $scope.model.selectedProgram.trackedEntityType.id
                }
            ],
            attributes: []
        };

        var art = {attributeValues: {}};
        angular.forEach($scope.model.selectedProgram.programTrackedEntityAttributes, function(pat){
            var value = $scope.model.art.attributeValues[pat.trackedEntityAttribute.id];
            var tea = $scope.model.trackedEntityAttributes[pat.trackedEntityAttribute.id];
            value = CommonUtils.formatDataValue(null, value, tea, $scope.model.optionSets, 'API');

            if ( tea.optionSetValue ){
                var optionSet = $scope.model.optionSets[tea.optionSet.id];
                if ( optionSet && optionSet.isTrafficLight ){
                    art.trafficLight = value;
                }
            }

            if ( value ){
                art.attributeValues[pat.trackedEntityAttribute.id] = $scope.model.art.attributeValues[pat.trackedEntityAttribute.id];
                tei.attributes.push({
                    attribute: tea.id,
                    value: value
                });
            }
        });

        ArtService.update(tei, $scope.model.selectedProgram.id).then(function(data){
            if( data.response.status==='ERROR' ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("operation_failed") + data.response.description );
                return;
            }
            else{
                var index = -1;
                for( var i=0; i<$scope.model.arts.length; i++){
                    if( $scope.model.arts[i].trackedEntityInstance === $scope.model.art.trackedEntityInstance ){
                        index = i;
                        break;
                    }
                }
                if ( index !== -1 ){
                    $scope.model.arts.splice(index,1);
                    $scope.model.arts.splice(0,0,art);
                }
                else{
                    $scope.model.arts.splice(0,0,art);
                }
            }
            $scope.showEditProfile();
        });
    };

    $scope.saveStatus = function(){
        console.log('trying to save status ...');
        //check for form validity
        $scope.outerForm.submitted = true;
        if( $scope.outerForm.$invalid ){
            console.log('form is invalid ...');
            return false;
        }

        console.log('need to save status here ...', $scope.model.selectedEvent);
    };

    $scope.setSelectedStage = function( stage ){
        $scope.resetForm();
        $scope.model.selectedStage = stage;
        $scope.model.originalEvent = {};
        if ( $scope.model.art.recommendationStatus[stage.id] ){
            $scope.model.selectedEvent = angular.copy($scope.model.art.recommendationStatus[stage.id]);
            $scope.model.originalEvent = angular.copy($scope.model.art.recommendationStatus[stage.id]);
        }
        else{
            $scope.model.selectedEvent = {};
        }
    };

    $scope.showImportArt = function(){
        $scope.model.displaImportArt = true;
    };

    $scope.isOnAddEditMode = function(){
        return $scope.model.displayAddArt || $scope.model.displaImportArt || $scope.model.displayEditArt;
    };

    $scope.interacted = function(field) {
        var status = false;
        if(field){
            status = $scope.outerForm.submitted || field.$dirty;
        }

        console.log('outerform....', $scope.outerform);
        return status;
    };

    $scope.cancelEdit = function(){
        $scope.model.displayAddArt = false;
        $scope.model.displaImportArt = false;
        $scope.model.displayEditArt = false;
        $scope.model.art = {};
        $scope.model.inputFile = null;
        $scope.model.excelData = null;
        $scope.model.excelRows = [];
        $scope.model.excelColumns = [];
        $scope.model.selectedSheet = null;
        $scope.model.parsingStarted = false;
        $scope.model.parsingFinished = true;
    };

    $scope.showEditProfile = function(){
        $scope.model.editProfile = !$scope.model.editProfile;
    };

    $scope.cancelEditProfile = function(){
        $scope.model.art = $scope.model.originalArt;
        $scope.model.editProfile = false;
        $scope.resetForm();
    };

    $scope.cancelEditStatus = function(){
        $scope.model.selectedEvent = $scope.model.originalEvent;
        $scope.resetForm();
    };

    $scope.reset= function(){
        $scope.model.selectedProgram = null;
        $scope.model.artHeaders = [];
        $scope.model.arts = [];
        $scope.model.art = {};

        $scope.resetForm();
    };

    $scope.resetForm = function(){
        $scope.outerForm.submitted = false;
        $scope.outerForm.$setPristine();
        $scope.model.selectedStage = null;
    };

    $scope.addOrEditArtDenied = function(){
        return !$scope.model.trackedEntityAccess;
    };

    $scope.addOrEditStatusDenied = function(){
        return false;
    };

    $scope.sortItems = function( header ){
        console.log('sorting...', header.id, ' - ', $scope.model.sortHeader.id );
        $scope.reverse = ($scope.model.sortHeader && $scope.model.sortHeader.id === header.id) ? !$scope.reverse : false;
        var direction = 'desc';
        if ( $scope.model.sortHeader.id === header.id ){
            console.log('am I here ... 0');
            if ( $scope.model.sortHeader.direction === direction ){
                console.log('am I here ... 1');
                direction = 'asc';
            }
        }
        $scope.model.sortHeader = {id: header.id, direction: direction};
        $scope.fetchRecommendations( $scope.model.sortHeader );
    };

    $scope.assignColumnToModel = function( column ){
        //console.log('assinged:  ', $scope.model.excelColumns);

        var isValidOption = function(options, value){
            if (!value){
                return true;
            }
            if ( options ){
               for(var i=0; i<options.length; i++){
                    if( value === options[i].displayName){
                        return true;
                    }
                }
            }
            return false;;
        };

        delete $scope.model.cellValidity[column.displayName];

        if( column.mappedObject ){
            $scope.model.cellValidity[column.displayName] = {};

            if ( column.mappedObject === $scope.selectedOrgUnit.id ){
                var index = 0;
                angular.forEach($scope.model.excelRows, function(row){
                    $scope.model.cellValidity[column.displayName][index] = row[column.displayName] === $scope.selectedOrgUnit.code;
                    index++;
                });
            }
            else{
                var att = $scope.model.trackedEntityAttributes[column.mappedObject];
                if ( att ){
                    var index = 0;
                    angular.forEach($scope.model.excelRows, function(row){
                        var isValid = true;
                        if ( att.optionSetValue ){
                            isValid = isValidOption( $scope.model.optionSets[att.optionSet.id], row[column.displayName] );
                        }
                        else{
                            isValid = dhis2.validation.isValidValueType( row[column.displayName], att.valueType );
                        }
                        $scope.model.cellValidity[column.displayName][index] = isValid;
                        index++;
                    });
                }
            }
        }
    };

    $scope.getUnAssignedHeaders = function( column ){
        var unAssignedHeaders = [];

        var isColumnAssigned = function( header ){
            var assigned = false;
            for( var i=0; i<$scope.model.excelColumns.length; i++){
                var col = $scope.model.excelColumns[i];
                if ( col.mappedObject === header.id && col.displayName !== column.displayName ){
                    assigned = true;
                    break;
                }
            }

            return assigned;
            if( !assigned ){
                unAssignedHeaders.push( header );
            }
        };

        var assigned = isColumnAssigned( $scope.model.voteColumn );
        if( !assigned ){
            unAssignedHeaders.push( $scope.model.voteColumn );
        }

        angular.forEach($scope.model.artHeaders, function(header){
            var assigned = isColumnAssigned( header );
            if( !assigned ){
                unAssignedHeaders.push( header );
            }
        });

        return unAssignedHeaders;
    };
});
