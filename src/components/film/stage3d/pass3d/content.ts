export interface RouteStop {
  code: string;
  city: string;
  detail: string;
}

export interface PassContent {
  lang: 'en' | 'id';
  name: string;
  initials?: string;
  route: readonly [RouteStop, RouteStop, RouteStop];
  date: string;
  seat: string;
  gate: string;
  ticketNo: string;
  labels: {
    kicker: string;
    admit: string;
    title: string;
    passenger: string;
    passengerNote: string;
    date: string;
    seat: string;
    gate: string;
    ticket: string;
    hostedBy: string;
    host: string;
    thanks: string;
    thanksCaption: string;
    occasion: string;
  };
}
