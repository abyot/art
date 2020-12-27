/* global angular, dhis2, art */

'use strict';

//Controller for settings page
art.controller('HomeController',
        function($scope,
                $translate,
                NotificationService,
                SessionStorageService,
                ArtService,
                ProgramFactory,
                MetaDataFactory,
                DateUtils,
                CommonUtils) {

    $scope.model = {
        optionSets: null,
        trackedEntityAttributes: null,
        dataElementsById: null,
        selectedStage: null,
        selectedEvent: null,
        events: [],
        programs: [],
        arts: [],
        art: {},
        artHeaders: [],
        showEditArt: false,
        showAddArt: false,
        showImportArt: false
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

                        console.log('dataElementsById:  ', $scope.model.dataElementsById);

                        $scope.model.trackedEntityAttributes = [];
                        MetaDataFactory.getAll('trackedEntityAttributes').then(function(teis){
                            angular.forEach(teis, function(tei){
                                $scope.model.trackedEntityAttributes[tei.id] = tei;
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
        $scope.model.selectedProgramStage = null;
        $scope.model.selectedOptionSet = null;
        $scope.model.documents = [];
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
        $scope.model.selectedProgramStage = null;
        $scope.model.selectedOptionSet = null;
        $scope.model.documents = [];
        if (angular.isObject($scope.selectedOrgUnit)) {
            ProgramFactory.getByOu( $scope.selectedOrgUnit ).then(function(res){
                $scope.model.programs = res.programs || [];
                $scope.model.selectedProgram = res.selectedProgram || null;
            });
        }
    };

    //load details for selected program
    $scope.loadProgramDetails = function (){
        if( $scope.model.selectedProgram && $scope.model.selectedProgram.id && $scope.model.selectedProgram.programStages.length > 0){
            $scope.model.artHeaders = [];
            $scope.model.programStageDataElements = null;
            angular.forEach($scope.model.selectedProgram.programTrackedEntityAttributes, function(pat){
                if( pat.displayInList && pat.trackedEntityAttribute && pat.trackedEntityAttribute.id ){
                    var tea = $scope.model.trackedEntityAttributes[pat.trackedEntityAttribute.id];
                    if( tea ){
                        $scope.model.artHeaders.push(tea);
                    }
                }
            });

            $scope.fetchRecommendations();
        }
    };

    //fetch recommendations for selected orgunit and program combination
    $scope.fetchRecommendations = function(){
        if( $scope.selectedOrgUnit && $scope.selectedOrgUnit.id && $scope.model.selectedProgram && $scope.model.selectedProgram.id ){
            ArtService.getByProgramAndOu($scope.model.selectedProgram, $scope.selectedOrgUnit, $scope.model.trackedEntityAttributes, $scope.model.optionSets).then(function(teis){
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
                    enrollmentDate: DateUtils.formatFromUserToApi($scope.model.art.enrollmentDate),
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
            if ( value ){
                art.attributeValues[pat.trackedEntityAttribute.id] = $scope.model.art[pat.trackedEntityAttribute.id];
                tei.attributes.push({
                    attribute: tea.id,
                    value: value
                });
            }
        });

        ArtService.save(tei).then(function(data){
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
        $scope.model.art = art;
        $scope.model.selectedStage = $scope.model.selectedProgram.programStages[0];
    };

    $scope.updateArt = function(){
        //check for form validity
        $scope.outerForm.submitted = true;
        if( $scope.outerForm.$invalid ){
            return false;
        }

        console.log('art to save:  ', $scope.model.art);
        /*var tei = {
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
            if ( value ){
                art.attributeValues[pat.trackedEntityAttribute.id] = $scope.model.art.attributeValues[pat.trackedEntityAttribute.id];
                tei.attributes.push({
                    attribute: tea.id,
                    value: value
                });
            }
        });

        ArtService.save(tei).then(function(data){
            if( data.response.importSummaries[0].status==='ERROR' ){
                NotificationService.showNotifcationDialog($translate.instant("error"), $translate.instant("art_add_failed") + data.response.importSummaries[0] );
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
            $scope.cancelEdit();
        });*/
    };

    $scope.setSelectedStage = function( stage ){
        $scope.model.selectedStage = stage;
        if ( $scope.model.art.recommendationStatus[stage.id] ){
            $scope.model.selectedEvent = $scope.model.art.recommendationStatus[stage.id];
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
        return status;
    };

    $scope.cancelEdit = function(){
        $scope.model.displayAddArt = false;
        $scope.model.displaImportArt = false;
        $scope.model.displayEditArt = false;
        $scope.model.art = {};
    };

    $scope.reset= function(){
        $scope.model.selectedProgram = null;
        $scope.model.artHeaders = [];
        $scope.model.arts = [];
        $scope.model.art = {};
    };

});
