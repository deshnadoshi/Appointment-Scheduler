const { time } = require('console');
const fs = require('fs');
const crypto = require('crypto');


const readline = require('node:readline').createInterface({
    input: process.stdin,
    output: process.stdout,
  });

function ask_question(question_string){   
    return new Promise((resolve) => {
        readline.question(question_string, (answer) => {
          resolve(answer);
        });
      });
    
}

async function process_input(){

    let start_format_correct = true; 
    let end_format_correct = true; 
    let start_valid = true; 
    let end_valid = true; 
    let start_date = ""; 
    let end_date = ""; 
    let booked_dates = []; 

    do {
        start_date = await ask_question("Enter the start date in your range (format: YYYY-MM-DD):");
        if (start_date.toLowerCase() === 'q'){
            process.exit(); 
        }

        start_format_correct = check_date_format(start_date); 
        if (start_format_correct){
            start_valid = is_valid_date(start_date); 
            if (!start_valid)
                console.log("That is not a valid date. You will be prompted to try again."); 
        }

    } while (start_format_correct == false ||  start_valid == false); 


    
    do {
        end_date = await ask_question("Enter the end date in your range (format: YYYY-MM-DD):");
        if (end_date.toLowerCase() === 'q'){
            process.exit(); 
        }
    
        end_format_correct = check_date_format(end_date); 
        if (end_format_correct){
            end_valid = is_valid_date(end_date); 
            if (!end_valid)
                console.log("That is not a valid date. You will be prompted to try again."); 
        }

    } while (end_format_correct == false || end_valid == false); 


    if (end_valid && start_valid){
        // code here for the next four available dates.
        let dates_available = false;
        dates_available = await find_N_dates(new Date(start_date), new Date(end_date)); 

        if (dates_available.length == 0){
            console.log("ERROR: There are no available dates in the chosen date range. The program will be terminated."); 
            process.exit(); 
        } else {
            console.log("The available dates in the chosen date range are: "); 
            const selection_dates = {};

            for (let i = 0; i < dates_available.length; i++) {
                const key = "date" + (i + 1); 
                selection_dates[key] = dates_available[i];
            }
            console.log(selection_dates);

            load_booked_dates(); 



            let valid_selection = true; 
            let book_this_date = new Date(); 
            do {

                selected_date = await ask_question("Please enter the corresponding identifier of the date you would like to select (i.e. date1, date2, etc.): "); 
                if (selection_dates.hasOwnProperty(selected_date)){
                    console.log("You selected", selection_dates[selected_date]); 
                    book_this_date = selection_dates[selected_date]; 
                    valid_selection = true; 
                } else {
                    console.log("The value you entered does not exist, please try again."); 
                    valid_selection = false; 
                }

            } while (valid_selection == false); 


            console.log("\n\nYou will be prompted to schedule your appointment. Please enter the information when prompted."); 
            let valid_attendee = true; 
            const email_regex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
            const phone_regex = /^\d{3}-?\d{3}-?\d{4}$/;
            let attendee_info = ""; 
        
            do {

                attendee = await ask_question("\nPlease enter the ATTENDEE (email or phone number): "); 
                if (email_regex.test(attendee) || phone_regex.test(attendee)){
                    valid_attendee = true; 
                    console.log("You entered", attendee); 
                    attendee_info = attendee; 
                } else {
                    console.log("That is not a valid attendee value. Please try again.");
                    valid_attendee = false; 
                }

            } while (valid_attendee == false); 


            let valid_method = true; 
            let method_info = ""; 
            do {

                method = await ask_question("\nPlease enter the METHOD: "); 
                if (method.toLowerCase() === "request"){
                    valid_method = true; 
                    method_info = method; 
                } else {
                    console.log("That is not a valid METHOD value. Please try again. You must enter REQUEST.");
                    valid_method = false; 
                }

            } while (valid_method == false); 


            let valid_status = true; 
            let status_info = ""; 
            do {

                status_val = await ask_question("\nPlease enter the STATUS: "); 
                if (status_val.toLowerCase() === "tentative" || status_val.toLowerCase() === "confirmed" ){
                    valid_status = true; 
                    status_info = status_val; 
                } else {
                    console.log("That is not a valid STATUS value. Please try again. You may enter TENTATIVE or CONFIRMED.");
                    status_info = false; 
                }

            } while (status_info == false); 

            const generated_dtstamp = new Date();
            generated_dtstamp.setHours(0, 0, 0, 0);

            console.log("\nThe DTSTAMP value is today's date:", generated_dtstamp); 
            
            const confirmation_code = generated_confirmation_code(); 
            console.log("\nThe confirmation code is", confirmation_code); 
           
            let successfully_added = false; 
            successfully_added = add_appointment(attendee_info, book_this_date, generated_dtstamp, method_info, status_info, confirmation_code); 
            if (successfully_added){
                console.log("\nYour appointment has been scheduled. Navigate to 'calendar.txt' to see the appointment."); 
            } else {
                console.log("\nYour appointment has not been scheduled. "); 
            }



        }


    }

}


function check_date_format(str){
    const date_regex = /^\d{4}-\d{2}-\d{2}$/;

    if (date_regex.test(str)){
        return true; 
    }

    return false; 
}


function is_valid_date(date_str) {
    let year = Number(date_str.split("-")[0]); 
    let month = Number(date_str.split("-")[1]) - 1; 
    let day = Number(date_str.split("-")[2]); 

    const date = new Date(year, month, day); 

    return (
        date.getFullYear() === year &&
        date.getMonth() === month &&
        date.getDate() === day
    );
}

async function find_N_dates(start_date, end_date){
    let available_dates = []; 

    let current_date = start_date; 

    let unavailable_dates = await load_booked_dates();
    // console.log(unavailable_dates);


    while (current_date <= end_date && available_dates.length < 4){
        current_date.setDate(current_date.getDate() + 1); // Move to the next day

        let check_overlap = compare_date_objects(current_date, unavailable_dates);
        
        if (!is_weekend(current_date) && !is_bank_holiday(current_date) && check_overlap == false){
            available_dates.push(new Date(current_date)); 
        }
    }


    return available_dates;

}

function is_bank_holiday(date_obj){


    const bank_holidays = [
        "01-01", // New Year's Day
        "07-04", // Independence Day
        "12-25",  // Christmas Day
        "02-19", // President's Day
        "06-19", // Juneteenth
        "11-11", // Veterans Day
        "11-28" // Thanksgiving
    ];

    if (bank_holidays.includes(date_obj.getMonth() + "-" + date_obj.getDate())){
        return true; 
    }

    return false; 

}

function is_weekend(date_obj){
    const is_weekend = (date_obj.getDay() === 0 || date_obj.getDay() === 6); 
    if (is_weekend){
        return true;  
    }

    return false; 

}

async function load_booked_dates() {
    return new Promise((resolve, reject) => {
        let booked_times = [];
        let booked_dates = [];

        fs.readFile("calendar.txt", 'utf8', (err, data) => {
            if (err) {
                console.error('Error reading the file. Please re-run the program.');
                reject(err);
                return;
            }

            let file_data = data.toString();
            let end_calendar = false;
            let begin_calendar = false;
            let begin_vevent = false;
            let end_vevent = false;

            let current_record = "";
            let records = [];

            file_data.split(/\r?\n/).forEach(line => {
                if ((line.toLowerCase()).includes("begin:vcalendar")) {
                    begin_vevent = true;
                }

                if ((line.toLowerCase()).includes("end:vcalendar")) {
                    end_vevent = true;
                }

                if (begin_vevent == true && end_vevent == false && (begin_calendar == false || end_calendar == true)) {
                    // Skip extraneous entries
                }

                if (end_vevent == false) {
                    if ((line.toLowerCase()).includes("begin:vevent")) {
                        begin_calendar = true;
                        end_calendar = false;
                    }

                    if ((begin_calendar == true) && (end_calendar == false)) {
                        current_record += (line + "\n");
                    }

                    if ((line.toLowerCase()).includes("end:vevent")) {
                        records.push(current_record);
                        end_calendar = true;
                        begin_calendar = false;
                        current_record = "";
                    }
                }
            });

            booked_times = records.map(event => {
                const match = event.match(/DTSTAMP:(\d{4}-\d{2}-\d{2})/);
                return match ? match[1] : null;
            });

            booked_dates = booked_times.map(dateString => new Date(dateString));

            resolve(booked_dates);
        });
    });
}


function compare_date_objects(date_obj, date_arr){

    for (let i = 0; i < date_arr.length; i++){
        if (date_arr[i].toString() === date_obj.toString()){
            return true;  // there are the same dates 
        }
    }

    return false; 
    

}


function generated_confirmation_code() {
    const timestamp = new Date().getTime().toString();
    const hash = crypto.createHash('sha256').update(timestamp).digest('hex');
    const code = hash.substring(0, 8); 
  
    return code;
  
}


async function add_appointment(attendee, dtstart, dtstamp, method, stat, uid){


    const dtstamp_date = dtstamp.toISOString().split('T')[0];
    const dtstart_date = dtstart.toISOString().split('T')[0];

    let new_appointment = `
BEGIN:VEVENT
ATTENDEE:${attendee.toUpperCase()}
DTSTART:${dtstart_date}
DTSTAMP:${dtstamp_date}
METHOD:${method.toUpperCase()}
STATUS:${stat.toUpperCase()}
UID:${uid}
END:VEVENT
`;

    try {
        let fileContent = await fs.promises.readFile('calendar.txt', 'utf-8');

        const lineIndex = 2;

        if (lineIndex !== -1) {
            fileContent = fileContent.slice(0, lineIndex + "BEGIN:VCALENDAR".length) + new_appointment + fileContent.slice(lineIndex + "BEGIN:VCALENDAR".length);
            await fs.promises.writeFile("calendar.txt", fileContent);
        }

        return true; 
    } catch (err) {
        console.error('Error reading or writing file:', err);
        return false; 
    }



}
  
  
process_input(); 