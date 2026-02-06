import { State } from "~~/server/lib/nwv2-api-lib/src/enums/enums";

export function shouldShowPreShow(preShow) {
  if (preShow.state !== State.Started) {
    return false;
  } else if (preShow.endAt < Date.now() && preShow.autoEnd) {
    return false;
  }
  return true;
}

export function shouldShowStatusPreShow(showStatus) {
  // console.log("show status preshow => ", showStatus.state, State.Started, new Date(showStatus.endAt).toLocaleString([], {
  //     timeZone: "Asia/Kathmandu"
  // }), new Date(Date.now()).toLocaleString([], {
  //     timeZone: "Asia/Kathmandu"
  // }), showStatus.autoEnd);

  if (showStatus.state === State.Started) {
    console.log("state");
    return true;
  } else if (showStatus.endAt < Date.now() && showStatus.autoEnd) {
    console.log("time");
    return false;
  }
  return true;
}

export function shouldShowEndShow(endShow) {
  if (endShow.state === State.Started) {
    return true;
  } else if (endShow.startAt < Date.now() && endShow.autoStart) {
    return true;
  }
  return false;
}

export function shouldShowStatusEndShow(showStatus) {
  // console.log("showStatus endshow =>", showStatus, new Date(showStatus.startAt).toLocaleString([], {
  //     timeZone: "Asia/Kathmandu"
  // }), new Date(Date.now()).toLocaleString([], {
  //     timeZone: "Asia/Kathmandu"
  // }), showStatus.autoStart);

  if (showStatus.state === State.Started) {
    console.log("end state");
    return true;
  } else if (showStatus.startAt < Date.now() && showStatus.autoStart) {
    console.log("end time");
    return true;
  }
  return false;
}

export function shouldShowStatus(showStatus) {
  // console.log("showStatus endshow =>", showStatus, new Date(showStatus.startAt).toLocaleString([], {
  //     timeZone: "Asia/Kathmandu"
  // }), new Date(Date.now()).toLocaleString([], {
  //     timeZone: "Asia/Kathmandu"
  // }), showStatus.autoStart);

  if (showStatus.state === State.Started) {
    console.log("State Started");
    return true;
  } else if (showStatus.endAt < Date.now() && showStatus.autoEnd) {
    console.log("End Time Ended");
    return false;
  } else if (showStatus.startAt < Date.now() && showStatus.autoStart) {
    console.log("Start Time Started");
    return true;
  }
  return false;
}

export function shouldShowSession(session) {
  if (session.state === State.Started) {
    return true;
  } else if (session.state === State.Ended) {
    return false;
  } else if (session.startAt < Date.now() && session.autoStart) {
    return true;
  }
  return false;
}

export function isSessionNotStarted(session) {
  return !isSessionStarted(session) && !isSessionEnded(session);
}

export function isSessionStarted(session) {
  if (session.state === State.Started) {
    return true;
  } else if (session.startAt < Date.now() && session.autoStart) {
    return true;
  }
  return false;
}

export function isSessionEnded(session) {
  return session.state === State.Ended;
}

export function shouldShowRegistration(event, registration) {
  const { endWithShow } = registration;
  if (!endWithShow && registration.endAt < Date.now()) {
    return false;
  } else if (endWithShow && event.endAt < Date.now()) {
    return false;
  }
  return true;
}

export function userCanJoinSession(viewer, session) {
  if (!viewer || !viewer.userGroups || !Array.isArray(viewer.userGroups)) {
    return false;
  }
  for (const userGroupId of viewer.userGroups) {
    if (session.userGroups.includes(userGroupId)) {
      return true;
    }
  }
  return false;
}
