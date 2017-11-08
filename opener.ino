String inputString = "";         // a String to hold incoming data
boolean stringComplete = false;  // whether the string is complete
const unsigned int button_emu_pressed = 200;
const unsigned int button_emu_cooldown = 200;
const unsigned int number_of_doors = 3;
unsigned long start_time[number_of_doors] = {0,0,0};
unsigned long time = 0;
unsigned long prevtime = 0;

/*
0 - door opened
1 - door closed and can be opened
2 - door closed and freezed
*/
int doors_flags[number_of_doors] = {1,1,1};
// {CAFE, SMOKE, SORTIR}
int doors_pins[number_of_doors] = {12,11,10};

void setup() {
  for (int i=0; i<number_of_doors; i++) {
    pinMode(doors_pins[i], OUTPUT);
  }

  Serial.begin(9600);
  
  // reserve 200 bytes for the inputString:
  inputString.reserve(200);
}

void loop() {
  prevtime = time;
  time = millis();

  // protecting from time variable overflow
  if (time < prevtime) {
    for (int i=0; i<number_of_doors; i++) {
      digitalWrite(doors_pins[i], LOW);
      doors_flags[i] = 1;
    }
  }

  //updating states
  for (int i=0; i<number_of_doors; i++) {
    if (doors_flags[i]==0 && start_time[i]+button_emu_pressed<time) {
      digitalWrite(doors_pins[i], LOW);
      doors_flags[i] = 2;
    } else if (doors_flags[i]==2 && start_time[i]+button_emu_pressed+button_emu_cooldown<time) {
      doors_flags[i] = 1;
    }
  }

  //processing command when it's completed
  if (stringComplete) {
    if (inputString == "door_cafe") {
      if (doors_flags[0] == 1) {
        digitalWrite(doors_pins[0], HIGH);
        start_time[0] = millis();
        doors_flags[0] = 0;
        Serial.print("Opening cafe side door\n");
      } else {
        Serial.print("Cafe side door is in cooldown\n");
      }
    } else if (inputString == "door_smoke") {
      if (doors_flags[1] == 1) {
        digitalWrite(doors_pins[1], HIGH);
        start_time[1] = millis();
        doors_flags[1] = 0;
        Serial.print("Opening smoke exit side door\n");
      } else {
        Serial.print("Smoke exit side door is in cooldown\n");
      }
    } else if (inputString == "door_sortir") {
      if (doors_flags[2] == 1) {
        digitalWrite(doors_pins[2], HIGH);
        start_time[2] = millis();
        doors_flags[2] = 0;
        Serial.print("Opening door_sortir side door\n");
      } else {
        Serial.print("Sortir side door is in cooldown\n");
      }
    } else {
      Serial.print("Command not parsed '" + inputString + "'\n");
    }

    // clearing command buffer
    inputString = "";
    stringComplete = false;
  }
}

/*
  SerialEvent occurs whenever a new data comes in the hardware serial RX. This
  routine is run between each time loop() runs, so using delay inside loop can
  delay response. Multiple bytes of data may be available.
*/

void serialEvent() {
  while (Serial.available()) {
    // get the new byte:
    char inChar = (char)Serial.read();

    if (inChar == '\n' or inChar == '\r') {
      // if the incoming character is a newline, set a flag so the main loop can do something about it
      if(inputString != "") {
        stringComplete = true;
      }
    } else {
      // add tyte to the inputString
      inputString += inChar;
    }
  }
}
