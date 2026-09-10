import { gql } from 'urql';

export const SITES_QUERY = gql`
  query Sites {
    sites {
      id
      name
      city
      addressLine
      services {
        id
        name
        description
        priceCents
        durationMinutes
      }
    }
  }
`;

export const AVAILABLE_SLOTS_QUERY = gql`
  query AvailableSlots($serviceId: ID!) {
    availableSlots(serviceId: $serviceId) {
      id
      serviceId
      startsAt
      employeeName
    }
  }
`;

export const BOOKING_SESSION_QUERY = gql`
  query BookingSession($id: ID!) {
    bookingSession(id: $id) {
      id
      status
      claimToken
      confirmationCode
      priceCents
      selections {
        siteId
        serviceId
        slotId
        isGiftBooking
        mode
        purchaserName
        purchaserEmail
        recipientName
        recipientEmail
      }
      site {
        id
        name
        city
        addressLine
      }
      service {
        id
        name
        description
        priceCents
        durationMinutes
      }
      slot {
        id
        startsAt
        employeeName
      }
      emailPreview {
        to
        toName
        fromName
        subject
        body
        claimUrl
        sentAt
      }
    }
  }
`;

// Recipient-facing preview. Server strips priceCents per FR-7.
export const GIFT_PREVIEW_QUERY = gql`
  query GiftPreview($bookingId: ID!) {
    getGiftBookingPreview(bookingId: $bookingId) {
      id
      status
      confirmationCode
      priceCents
      selections {
        mode
        purchaserName
        recipientName
        recipientEmail
        slotId
      }
      site {
        id
        name
        city
        addressLine
      }
      service {
        id
        name
        description
        durationMinutes
      }
      slot {
        id
        startsAt
        employeeName
      }
    }
  }
`;

export const START_SESSION_MUTATION = gql`
  mutation StartBookingSession {
    startBookingSession {
      id
      status
      selections {
        siteId
        serviceId
        slotId
        isGiftBooking
        mode
      }
    }
  }
`;

export const MAKE_SELECTIONS_MUTATION = gql`
  mutation MakeSelections($sessionId: ID!, $input: SelectionsInput!) {
    makeSelections(sessionId: $sessionId, input: $input) {
      id
      status
      priceCents
      selections {
        siteId
        serviceId
        slotId
        isGiftBooking
        mode
        purchaserName
        purchaserEmail
        recipientName
        recipientEmail
      }
      site {
        id
        name
      }
      service {
        id
        name
        priceCents
      }
      slot {
        id
        startsAt
        employeeName
      }
    }
  }
`;

// Handles SELF and Phase 1A (GIFT_SCHEDULE_NOW).
export const PAY_AND_FINALIZE_MUTATION = gql`
  mutation PayAndFinalize($input: PayAndFinalizeInput!) {
    payAndFinalize(input: $input) {
      id
      status
      confirmationCode
      claimToken
    }
  }
`;

// Phase 1B — Purchase Now, Schedule Later. Matches PR #1766.
export const FINALIZE_GIFT_BOOKING_MUTATION = gql`
  mutation FinalizeGiftBooking($input: PayAndFinalizeInput!) {
    finalizeGiftBooking(input: $input) {
      id
      status
      claimToken
      emailPreview {
        to
        toName
        fromName
        subject
        body
        claimUrl
        sentAt
      }
    }
  }
`;

export const CLAIM_GIFT_MUTATION = gql`
  mutation ClaimGift($input: ClaimGiftInput!) {
    claimGiftBooking(input: $input) {
      id
      status
      selections {
        recipientEmail
      }
    }
  }
`;

export const SCHEDULE_CLAIMED_MUTATION = gql`
  mutation ScheduleClaimed($bookingId: ID!, $slotId: ID!) {
    scheduleClaimedBooking(bookingId: $bookingId, slotId: $slotId) {
      id
      status
      confirmationCode
      slot {
        id
        startsAt
        employeeName
      }
    }
  }
`;
