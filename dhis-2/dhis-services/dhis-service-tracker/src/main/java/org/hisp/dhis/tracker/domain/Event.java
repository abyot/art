package org.hisp.dhis.tracker.domain;

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

import com.fasterxml.jackson.annotation.JsonProperty;
import com.vividsolutions.jts.geom.Geometry;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import org.hisp.dhis.common.BaseLinkableObject;
import org.hisp.dhis.event.EventStatus;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * @author Morten Olav Hansen <mortenoh@gmail.com>
 */
@Data
@Builder
@EqualsAndHashCode( callSuper = true )
@NoArgsConstructor
@AllArgsConstructor
public class Event
    extends BaseLinkableObject
{
    private String uid;

    @JsonProperty
    private String event;

    @JsonProperty
    @Builder.Default
    private EventStatus status = EventStatus.ACTIVE;

    @JsonProperty
    private String program;

    @JsonProperty
    private String programStage;

    @JsonProperty
    private String enrollment;

    @JsonProperty
    private EnrollmentStatus enrollmentStatus;

    @JsonProperty
    private String orgUnit;

    @JsonProperty
    private String trackedEntity;

    @JsonProperty
    private Set<Relationship> relationships;

    @JsonProperty
    private String occurredAt;

    @JsonProperty
    private String scheduledAt;

    @JsonProperty
    private String storedBy;

    @JsonProperty
    private boolean followUp;

    @JsonProperty
    private boolean deleted;

    @JsonProperty
    private String createdAt;

    @JsonProperty
    private String updatedAt;

    @JsonProperty
    private String clientCreatedAt;

    @JsonProperty
    private String clientUpdatedAt;

    @JsonProperty
    private String attributeOptionCombo;

    @JsonProperty
    private String attributeCategoryOptions;

    @JsonProperty
    private String completedBy;

    @JsonProperty
    private String completedAt;

    @JsonProperty
    private Geometry geometry;

    @JsonProperty
    @Builder.Default
    private Set<DataValue> dataValues = new HashSet<>();

    @JsonProperty
    @Builder.Default
    private List<Note> notes = new ArrayList<>();
}
