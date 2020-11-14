/* global angular, dhis2, art */

'use strict';

//Controller for settings page
art.controller('HomeController',
        function($scope,
                $translate,
                $modal,
                $filter,
                $window,
                ModalService,
                NotificationService,
                SessionStorageService,
                ArtService,
                ProgramFactory,
                MetaDataFactory,
                DateUtils,
                FileService,
                CommonUtils,
                DHIS2URL) {
                    
    $scope.model = {
        optionSets: null,
        trackedEntityAttributes: null,
        fileDataElement: null,
        typeDataElement: null,
        descDataElement: null,
        selectedOptionSet: null,
        events: [],
        programs: [],
        arts: [],
        artHeaders: [],
        editArt: false
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
                    
                    $scope.model.trackedEntityAttributes = [];
                    MetaDataFactory.getAll('trackedEntityAttributes').then(function(teis){            
                        angular.forEach(teis, function(tei){
                            $scope.model.trackedEntityAttributes[tei.id] = tei;
                        });

                        $scope.loadPrograms($scope.selectedOrgUnit);
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

    $scope.loadProgramDetails = function (){
        if( $scope.model.selectedProgram && $scope.model.selectedProgram.id && $scope.model.selectedProgram.programStages.length > 0){
            $scope.model.artHeaders = [];
            angular.forEach($scope.model.selectedProgram.programTrackedEntityAttributes, function(prte){
                if( prte.displayInList && prte.trackedEntityAttribute && prte.trackedEntityAttribute.id ){
                    var tea = $scope.model.trackedEntityAttributes[prte.trackedEntityAttribute.id];
                    if( tea ){
                        $scope.model.artHeaders.push(tea);
                    }
                }
            });
            $scope.fetchRecommendations();
        }
    };
    
    $scope.fetchRecommendations = function(){
        
        if( $scope.selectedOrgUnit && $scope.selectedOrgUnit.id && $scope.model.selectedProgram && $scope.model.selectedProgram.id ){
            ArtService.getByProgramAndOu($scope.model.selectedProgram, $scope.selectedOrgUnit, $scope.model.trackedEntityAttributes, $scope.model.optionSets).then(function(teis){
                $scope.model.arts = teis;
            });
        }
    };
    
    $scope.reset= function(){
        $scope.model.selectedProgram = null;
        $scope.model.artHeaders = [];
        $scope.model.arts = [];
    };
    
    $scope.interacted = function(field) {
        var status = false;
        if(field){            
            status = $scope.outerForm.submitted || field.$dirty;
        }
        return status;
    };
    
    $scope.addArt = function(){
        $scope.model.editArt = true;
    };
    
    $scope.importArt = function(){
        $scope.model.editArt = true;
    };
    
    $scope.editArt = function(art){
        console.log('selected art:  ', art);
        $scope.model.editArt = true;
    };
    
    $scope.cancelEdit = function(){
        $scope.model.editArt = false;        
    };
});
