import { request } from './request.ts';
import { Route } from './types.ts';
import { REQUEST_URL, SEAT_CLASS, USE_CREDIT_PRICE, TEMP_FILE } from './config.ts';

type BigChangeData = {
    status: boolean,
    reason?: string,
};

const bigChange = (oldFreeSeats: number, oldPrice: number, newFreeSeats: number, newPrice: number): BigChangeData => {
    if (newPrice != oldPrice)
        return { status: true, reason: 'the price has changed' };

    if (newFreeSeats != oldFreeSeats && newFreeSeats < 10)
        return { status: true, reason: 'a seat was booked and there\'s only less than ten of available ones' };

    const oldFreeSeatsTens = Math.floor(oldFreeSeats / 10) * 10;
    const newFreeSeatsTens = Math.floor(newFreeSeats / 10) * 10;

    if (newFreeSeatsTens != oldFreeSeatsTens)
        return { status: true, reason: 'another ten seats were booked' };

    return { status: false };
};

const prevLine = (await Deno.readTextFile(TEMP_FILE)).trim();
const prevFreeSeats = Number.parseInt(prevLine.split('\t')[0]);
const prevPrice = Number.parseInt(prevLine.split('\t')[1]);

const route = await request<Route>(REQUEST_URL, { headers: { 'X-Currency': 'CZK' }});

const priceClass = route.priceClasses.find(priceClass => priceClass.seatClassKey === SEAT_CLASS);

const currentPrice = USE_CREDIT_PRICE ? priceClass!.creditPrice : priceClass!.price;
const currentFreeSeats = priceClass!.freeSeatsCount;

const tempLine = `${currentFreeSeats}\t${currentPrice}`;
await Deno.writeTextFile(TEMP_FILE, tempLine);

const change = bigChange(prevFreeSeats, prevPrice, currentFreeSeats, currentPrice);

if (change.status) {

    const departureTime = new Date(route.departureTime);

    console.log(`CHANGE:  ${change.reason}`);
    console.log();
    console.log(`From:  ${route.departureCityName}`);
    console.log(`To:  ${route.arrivalCityName}`);
    console.log(`Date:  ${departureTime}`);
    console.log();
    console.log(`Free Seats:  ${currentFreeSeats}  (old=${prevFreeSeats})`);
    console.log(`Price:  ${currentPrice}  (old=${prevPrice})`);
}
