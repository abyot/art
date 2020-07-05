package org.hisp.dhis.analytics.event.data;

/*
 * Copyright (c) 2004-2020, University of Oslo
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this
 * list of conditions and the following disclaimer.
 *
 * Redistributions in binary form must reproduce the above copyright notice,
 * this list of conditions and the following disclaimer in the documentation
 * and/or other materials provided with the distribution.
 * Neither the name of the HISP project nor the names of its contributors may
 * be used to endorse or promote products derived from this software without
 * specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR
 * ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON
 * ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import org.hisp.dhis.DhisSpringTest;
import org.hisp.dhis.analytics.AggregationType;
import org.hisp.dhis.analytics.QueryValidator;
import org.hisp.dhis.analytics.TimeField;
import org.hisp.dhis.analytics.event.EventQueryParams;
import org.hisp.dhis.analytics.event.EventQueryValidator;
import org.hisp.dhis.common.IdentifiableObjectManager;
import org.hisp.dhis.common.IllegalQueryException;
import org.hisp.dhis.common.QueryItem;
import org.hisp.dhis.common.ValueType;
import org.hisp.dhis.dataelement.DataElement;
import org.hisp.dhis.dataelement.DataElementDomain;
import org.hisp.dhis.feedback.ErrorCode;
import org.hisp.dhis.feedback.ErrorMessage;
import org.hisp.dhis.legend.LegendSet;
import org.hisp.dhis.option.OptionSet;
import org.hisp.dhis.organisationunit.OrganisationUnit;
import org.hisp.dhis.organisationunit.OrganisationUnitService;
import org.hisp.dhis.program.Program;
import org.hisp.dhis.setting.SettingKey;
import org.hisp.dhis.setting.SystemSettingManager;
import org.hisp.dhis.trackedentity.TrackedEntityAttribute;
import org.joda.time.DateTime;
import org.junit.Rule;
import org.junit.Test;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnit;
import org.mockito.junit.MockitoRule;
import org.springframework.beans.factory.annotation.Autowired;

import com.google.common.collect.Lists;

import static org.junit.Assert.assertEquals;
import static org.mockito.Mockito.when;

/**
 * @author Lars Helge Overland
 */
public class EventQueryValidatorTest
    extends DhisSpringTest
{
    private Program prA;

    private DataElement deA;
    private DataElement deB;
    private DataElement deC;
    private DataElement deD;
    private DataElement deE;

    private TrackedEntityAttribute atA;
    private TrackedEntityAttribute atB;

    private OrganisationUnit ouA;
    private OrganisationUnit ouB;
    private OrganisationUnit ouC;

    private LegendSet lsA;
    private OptionSet osA;

    @Autowired
    private IdentifiableObjectManager idObjectManager;

    @Autowired
    private OrganisationUnitService organisationUnitService;

    @Mock
    private SystemSettingManager systemSettingManager;

    @Mock
    private QueryValidator aggregateQueryValidator;

    @Rule
    public MockitoRule mockitoRule = MockitoJUnit.rule();

    private EventQueryValidator queryValidator;

    @Override
    public void setUpTest()
    {
        queryValidator = new DefaultEventQueryValidator( aggregateQueryValidator, systemSettingManager );

        prA = createProgram( 'A' );
        prA.setUid( "programuida" );

        idObjectManager.save( prA );

        deA = createDataElement( 'A', ValueType.INTEGER, AggregationType.SUM, DataElementDomain.TRACKER );
        deB = createDataElement( 'B', ValueType.INTEGER, AggregationType.SUM, DataElementDomain.TRACKER );
        deC = createDataElement( 'C', ValueType.INTEGER, AggregationType.AVERAGE_SUM_ORG_UNIT, DataElementDomain.TRACKER );
        deD = createDataElement( 'D', ValueType.INTEGER, AggregationType.AVERAGE_SUM_ORG_UNIT, DataElementDomain.TRACKER );
        deE = createDataElement( 'E', ValueType.COORDINATE, AggregationType.NONE, DataElementDomain.TRACKER );

        idObjectManager.save( deA );
        idObjectManager.save( deB );
        idObjectManager.save( deC );
        idObjectManager.save( deD );
        idObjectManager.save( deE );

        atA = createTrackedEntityAttribute( 'A' );
        atB = createTrackedEntityAttribute( 'B' );

        idObjectManager.save( atA );
        idObjectManager.save( atB );

        ouA = createOrganisationUnit( 'A' );
        ouB = createOrganisationUnit( 'B', ouA );
        ouC = createOrganisationUnit( 'C', ouA );

        organisationUnitService.addOrganisationUnit( ouA );
        organisationUnitService.addOrganisationUnit( ouB );
        organisationUnitService.addOrganisationUnit( ouC );

        lsA = createLegendSet( 'A' );

        idObjectManager.save( lsA );

        osA = new OptionSet( "OptionSetA", ValueType.TEXT );

        idObjectManager.save( osA );
    }

    @Test
    public void validateSuccesA()
    {
        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withStartDate( new DateTime( 2010, 6, 1, 0, 0 ).toDate() )
            .withEndDate( new DateTime( 2012, 3, 20, 0, 0 ).toDate() )
            .withOrganisationUnits( Lists.newArrayList( ouA ) ).build();

        queryValidator.validate( params );
    }

    @Test
    public void validateValidTimeField()
    {
        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withStartDate( new DateTime( 2010, 6, 1, 0, 0 ).toDate() )
            .withEndDate( new DateTime( 2012, 3, 20, 0, 0 ).toDate() )
            .withOrganisationUnits( Lists.newArrayList( ouA ) )
            .withTimeField( TimeField.INCIDENT_DATE.name() ).build();

        queryValidator.validate( params );
    }

    @Test( expected = IllegalQueryException.class )
    public void validateFailureNoStartEndDatePeriods()
    {
        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withOrganisationUnits( Lists.newArrayList( ouB ) ).build();

        queryValidator.validate( params );
    }

    @Test
    public void validateErrorNoStartEndDatePeriods()
    {
        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withOrganisationUnits( Lists.newArrayList( ouB ) ).build();

        ErrorMessage error = queryValidator.validateForErrorMessage( params );

        assertEquals( ErrorCode.E7205, error.getErrorCode() );
    }

    @Test( expected = IllegalQueryException.class )
    public void validateInvalidQueryItem()
    {
        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withStartDate( new DateTime( 2010, 6, 1, 0, 0 ).toDate() )
            .withEndDate( new DateTime( 2012, 3, 20, 0, 0 ).toDate() )
            .withOrganisationUnits( Lists.newArrayList( ouB ) )
            .addItem( new QueryItem( deA, lsA, ValueType.TEXT, AggregationType.NONE, osA ) ).build();

        queryValidator.validate( params );
    }

    @Test( expected = IllegalQueryException.class )
    public void validateInvalidTimeField()
    {
        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withStartDate( new DateTime( 2010, 6, 1, 0, 0 ).toDate() )
            .withEndDate( new DateTime( 2012, 3, 20, 0, 0 ).toDate() )
            .withOrganisationUnits( Lists.newArrayList( ouA ) )
            .withTimeField( "notAUidOrTimeField" ).build();

        queryValidator.validate( params );
    }

    @Test( expected = IllegalQueryException.class )
    public void validateInvalidOrgUnitField()
    {
        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withStartDate( new DateTime( 2010, 6, 1, 0, 0 ).toDate() )
            .withEndDate( new DateTime( 2012, 3, 20, 0, 0 ).toDate() )
            .withOrganisationUnits( Lists.newArrayList( ouA ) )
            .withOrgUnitField( "notAUid" ).build();

        queryValidator.validate( params );
    }

    @Test
    public void validateErrorPage()
    {
        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withOrganisationUnits( Lists.newArrayList( ouB ) )
            .withPage( -2 ).build();

        ErrorMessage error = queryValidator.validateForErrorMessage( params );

        assertEquals( ErrorCode.E7207, error.getErrorCode() );
    }

    @Test
    public void validateErrorPageSize()
    {
        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withOrganisationUnits( Lists.newArrayList( ouB ) )
            .withPageSize( -1 ).build();

        ErrorMessage error = queryValidator.validateForErrorMessage( params );

        assertEquals( ErrorCode.E7208, error.getErrorCode() );
    }

    @Test
    public void validateErrorMaxLimit()
    {
        when( systemSettingManager.getSystemSetting( SettingKey.ANALYTICS_MAX_LIMIT ) )
            .thenReturn( 100 );

        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withOrganisationUnits( Lists.newArrayList( ouB ) )
            .withLimit( 200 ).build();

        ErrorMessage error = queryValidator.validateForErrorMessage( params );

        assertEquals( ErrorCode.E7209, error.getErrorCode() );
    }

    @Test
    public void validateErrorClusterSize()
    {
        EventQueryParams params = new EventQueryParams.Builder()
            .withProgram( prA )
            .withOrganisationUnits( Lists.newArrayList( ouB ) )
            .withCoordinateField( deE.getUid() )
            .withClusterSize( -3L ).build();

        ErrorMessage error = queryValidator.validateForErrorMessage( params );

        assertEquals( ErrorCode.E7212, error.getErrorCode() );
    }
}