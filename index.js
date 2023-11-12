require("dotenv").config();

//Express App Initialization
const express = require("express");
const app = express();

//Adding CORS to Express App
const cors = require("cors");
app.use(cors());

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

//for encrypting data
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const secret_patient = process.env.JWT_SECRET_PATIENT;
const secret_doctor = process.env.JWT_SECRET_DOCTOR;
const secret_hospital_clinic = process.env.JWT_SECRET_HOSPITAL_CLINIC;
const secret_admin = process.env.JWT_SECRET_ADMIN;


//MongoDB Connection
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");

// const uri = `mongodb+srv://${encodeURIComponent(
//   process.env.MONGO_USER
// )}:${encodeURIComponent(
//   process.env.MONGO_PASSWORD
// )}@cluster-clinica.vzvphhj.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(process.env.MONGO_URL, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
  useNewUrlParser: true, useUnifiedTopology: true,
});

// async function run() {
//   try {
//     // Connect the client to the server	(optional starting in v4.7)
//     await client.connect();
//     // Send a ping to confirm a successful connection
//     await client.db("admin").command({ ping: 1 });
//     console.log("Pinged your deployment. You successfully connected to MongoDB!");
//   } finally {
//     // Ensures that the client will close when you finish/error
//     await client.close();
//   }
// }
// run().catch(console.dir);

//Getting collection from Database
const clinica_db = client.db("clinica");
const patients = clinica_db.collection("patients");
const doctors = clinica_db.collection("doctors");
const medical_records = clinica_db.collection("medical_records");
const hospitals_clinics = clinica_db.collection("hospitals_clinics");
const admin = clinica_db.collection("admin");

const transaction_track = clinica_db.collection("transaction_track");
//Routes

// =================================== Patient Endpoints  =================================== //

//Welcome 
app.get("/", async function (req, res) {
 
  return res.json({ msg: "Welcome to Clinica API !!!" });
})
//Single Patient Register  Endpoint
// app.post("/patients", async function (req, res) {
//   const {
//     nrc,
//     name,
//     email,
//     phone,
//     address,
//     dob,
//     sex,
//     height,
//     weight,
//     password,
//   } = req.body;

//   //checking the data
//   if (
//     !nrc ||
//     !name ||
//     !email ||
//     !phone ||
//     !address ||
//     !dob ||
//     !sex ||
//     !height ||
//     !weight ||
//     !password
//   ) {
//     return res.status(400).json({ msg: "required: something !!!" });
//   }

//   //hashing the password
//   let hashed_password = await bcrypt.hash(password, 10);

//   const age_finder = (dob) => {
//     const age=new Date().getFullYear() - Number(dob);
//     return age;
//   };

//   const user_data = {
//     patient_nrc: nrc,
//     patient_name: name,
//     patient_email: email,
//     patient_phone: phone,
//     patient_dob: dob,
//     patient_age: age_finder(dob),
//     patient_sex: sex,
//     patient_height: height,
//     patient_weight: weight,
//     patient_address: address || "",
//     allergic_history: [],
//     medical_history: [],
//     visited_doctor_list: [],
//     visited_hospital_clinic_list: [],
//     patient_password: hashed_password,
//     role: "patient",
//     patient_medical_records: [],
//   };

//   const result = await patients.insertOne(user_data);

//   return res.status(201).json(result);
// });

//patient login Middleware to check JWT
const auth = function (req, res, next) {
  const { authorization } = req.headers;
  const token = authorization && authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Token required" });
  }

  try {
    let user = jwt.verify(token, secret_patient);
    res.locals.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ msg: err.message });
  }
};

//patient login endpoint
app.post("/patients-login", async function (req, res) {
  const { patient_email, password } = req.body;

  if (!patient_email || !password) {
    return res
      .status(400)
      .json({ msg: "required: name or email or password !!!" });
  }

  try {
    const user = await patients.findOne({ patient_email });
    console.log(user);

    if (user) {
      const result = await bcrypt.compare(password, user.patient_password);

      if (result) {
        const token = jwt.sign(user, secret_patient);
        return res.status(201).json({ token, user });
      }
    }

    return res
      .status(403)
      .json({ msg: "Incorrect name or email or password !!!" });
  } catch (e) {
    return res.status(500).json({ msg: e.message });
  }
});

//patient -> N medical record list Endpoint
//auth,
app.get("/medical_records", auth, async function (req, res) {
  const { patient_id, limit } = req.body;

  if (!patient_id || !limit) {
    res.status(400).json({ msg: "required: something !!!" });
  }

  try {
    const data = await medical_records
      .find({ patient_id: new ObjectId(patient_id) })
      .limit(Number(limit))
      .toArray();

    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

//patient -> N medical record list with date Endpoint
//auth,
app.get("/medical_records_with_date", auth, async function (req, res) {
  const { patient_id, limit, date } = req.body;

  if (!date || !patient_id || !limit) {
    res.status(400).json({ msg: "required: something !!!" });
  }

  try {
    const data = await medical_records
      .find({
        record_created_date: new Date(date),
        patient_id: new ObjectId(patient_id),
      })
      .limit(Number(limit))
      .toArray();

    return res.status(201).json(data);
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

//Single medical record detail Endpoint
//auth,
app.get("/medical_records/:id", auth, async function (req, res) {
  const { id } = req.params;

  const data = await medical_records.findOne({ _id: new ObjectId(id) });
  return res.json(data);
});

//Patient Profile Page Endpoint
//Single User Endpoint
app.get("/patients/:id", auth, async function (req, res) {
  const { id } = req.params;
  const data = await patients.findOne({ _id: new ObjectId(id) });
  return res.json(data);
});

//Patient Email Edit Endpoint
app.put("/patients-email/:id", auth, async function (req, res) {
  const { id } = req.params;
  const { new_email } = req.body;

  if (!new_email) {
    return res.status(400).json({ msg: "required: something !!!" });
  }

  try {
    const updateddata = await patients.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { patient_email: new_email },
      }
    );

    return res.status(201).json(updateddata);
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

//Patient Password Edit Endpoint
app.put("/patients-password/:id", auth, async function (req, res) {
  const { id } = req.params;
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ msg: "Required: Something !!!" });
  }

  const user = await patients.findOne({ _id: new ObjectId(id) });

  if (await bcrypt.compare(old_password, user.patient_password)) {
    if (await bcrypt.compare(new_password, user.patient_password)) {
      return res.status(400).json({ msg: "Try Different Password !!!" });
    }

    //hashing the password
    let hashed_new_password = await bcrypt.hash(new_password, 10);

    try {
      const updateddata = await patients.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { patient_password: hashed_new_password },
        }
      );

      return res.status(201).json(updateddata);
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  } else {
    return res.status(500).json({ msg: "Try correct password" });
  }
});

// =================================== Doctor Endpoints  =================================== //

//Single Doctor Register Endpoint
// app.post("/doctors", async function (req, res) {
//   const { nrc, name, email, phone, qualification, specialty, password } =
//     req.body;

//   //checking the data
//   if (!nrc || !name || !email || !phone || !qualification || !specialty || !password) {
//     return res.status(400).json({ msg: "required: something !!!" });
//   }

//   //hashing the password
//   let hashed_password = await bcrypt.hash(password, 10);

//   const doctor_data = {
//     doctor_nrc: nrc,
//     doctor_name: name,
//     doctor_email: email,
//     doctor_phone: phone,
//     doctor_qualification:qualification,
//     doctor_specialty: specialty,
//     assigned_clinic_hospital: [],
//     patient_list: [],
//     doctor_password: hashed_password,
//   };

//   const result = await doctors.insertOne(doctor_data);

//   return res.status(201).json(result);
// });

const doctor_auth = function (req, res, next) {
  const { authorization } = req.headers;
  const token = authorization && authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Token required" });
  }

  try {
    let user = jwt.verify(token, secret_doctor);
    res.locals.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ msg: err.message });
  }
};

//doctor login endpoint
app.post("/doctors-login", async function (req, res) {
  const { doctor_email, password } = req.body;

  if (!doctor_email || !password) {
    return res.status(400).json({ msg: "required: email or password !!!" });
  }

  try {
    const user = await doctors.findOne({ doctor_email });

    if (user) {
      const result = await bcrypt.compare(password, user.doctor_password);

      if (result) {
        const token = jwt.sign(user, secret_doctor);
        return res.status(201).json({ token, user });
      }
    }

    return res.status(403).json({ msg: "Incorrect email or password !!!" });
  } catch (e) {
    return res.status(500).json({ msg: e.message });
  }
});

//Single Doctor's Assigned Hospitals Cinics Endpoint
app.get(
  "/doctors-assigned-hospitals/:id",
  doctor_auth,
  async function (req, res) {
    const { id } = req.params;

    const data = await doctors
      .aggregate([
        {
          $match: { _id: new ObjectId(id) },
        },
        {
          $lookup: {
            from: "hospitals_clinics",
            localField: "assigned_clinic_hospital",
            foreignField: "_id",
            as: "assigned_clinics_hospitals",
          },
        },
      ])
      .toArray();

    const format = data[0];

    if (format.assigned_clinics_hospitals) {
      format.assigned_clinics_hospitals = format.assigned_clinics_hospitals.map(
        (assigned_clinic_hospital) => {
          assigned_clinic_hospital = {
            hospital_clinic_id: assigned_clinic_hospital._id,
            hospital_clinic_name: assigned_clinic_hospital.hospital_clinic_name,
          };
          return assigned_clinic_hospital;
        }
      );
    }
    //console.log(format.assigned_clinics_hospitals);
    return res.json(format.assigned_clinics_hospitals);
  }
);

//1
//All Medical Records by Hospitals Cinics Endpoint
app.get(
  "/list_of_medical_records_of_all_patients_that_hospital_administered",
  doctor_auth,
  async function (req, res) {
    const { hospital_clinic_id, limit } = req.body;

    if (!hospital_clinic_id || !limit) {
      return res.status(400).json({ msg: "required: something !!!" });
    }

    let medical_list = "";

    //Default list of medical data with patient name, illeness name, time created
    if (hospital_clinic_id) {
      const data = await medical_records
        .aggregate([
          {
            $match: {
              hospital_clinic_id: new ObjectId(hospital_clinic_id),
            },
          },
          {
            $lookup: {
              from: "patients",
              localField: "patient_id",
              foreignField: "_id",
              as: "patient",
            },
          },
          {
            $unwind: "$patient",
          },
          {
            $lookup: {
              from: "doctors",
              localField: "doctor_id",
              foreignField: "_id",
              as: "doctor",
            },
          },
          {
            $unwind: "$doctor",
          },
          {
            $addFields: {
              patient_name: "$patient.patient_name",
              doctor_name: "$doctor.doctor_name",
            },
          },
          {
            $project: {
              patient: 0,
              doctor: 0,
            },
          },
        ])
        .limit(Number(limit))
        .toArray();

      medical_list = data.map((result) => {
        delete result.cause_of_illeness;
        delete result.doctor_recommendation;
        delete result.doctor_medication_list;
        delete result.cause_of_illenes;
        delete result.patient_blood_pressure;
        delete result.patient_oxygen_level;
        delete result.patient_heart_rate;
        delete result.patient_body_temperature;
        return result;
      });
    }

    return res.json(medical_list);
  }
);

//2
//All Medical Records by single Doctor at Hospitals/Cinics Endpoint
app.get(
  "/list_of_medical_records_of_all_patients_that_doctor_assigned_at_hospital",
  doctor_auth,
  async function (req, res) {
    const { doctor_id, hospital_clinic_id, limit } = req.body;

    if (!doctor_id || !hospital_clinic_id || !limit) {
      return res.status(400).json({ msg: "required: something !!!" });
    }

    let medical_list = "";

    //Default list of medical data with patient name, illeness name, time created
    if (doctor_id && hospital_clinic_id) {
      const data = await medical_records
        .aggregate([
          {
            $match: {
              doctor_id: new ObjectId(doctor_id),
              hospital_clinic_id: new ObjectId(hospital_clinic_id),
            },
          },
          {
            $lookup: {
              from: "patients",
              localField: "patient_id",
              foreignField: "_id",
              as: "patient",
            },
          },
          {
            $unwind: "$patient",
          },
          {
            $lookup: {
              from: "doctors",
              localField: "doctor_id",
              foreignField: "_id",
              as: "doctor",
            },
          },
          {
            $unwind: "$doctor",
          },
          {
            $addFields: {
              patient_name: "$patient.patient_name",
              doctor_name: "$doctor.doctor_name",
            },
          },
          {
            $project: {
              patient: 0,
              doctor: 0,
            },
          },
        ])
        .limit(Number(limit))
        .toArray();

      medical_list = data.map((result) => {
        delete result.cause_of_illness;
        delete result.doctor_recommendation;
        delete result.doctor_medication_list;
        return result;
        //  console.log(result);
      });
    }

    //if doctor search by name and time
    if (doctor_id && hospital_clinic_id && patient_name && date) {
      data = await patients
        .find({ patient_name: patient_name }, { patient_medical_records: 1 })
        .limit(Number(limit))
        .toArray();
    }

    // const data = await medical_records
    //   .aggregate([
    //     {
    //       $match: {
    //         doctor_id: new ObjectId(doctor_id),
    //         hospital_clinic_id: new ObjectId(hospital_clinic_id),
    //       },
    //     },
    //     {
    //       $lookup: {
    //         from: "patients",
    //         localField: "patient_id",
    //         foreignField: "_id",
    //         as: "patient",
    //       },
    //     },
    //     {
    //       $unwind: "$patient",
    //     },
    //     {
    //       $lookup: {
    //         from: "doctors",
    //         localField: "doctor_id",
    //         foreignField: "_id",
    //         as: "doctor",
    //       },
    //     },
    //     {
    //       $unwind: "$doctor",
    //     },
    //     {
    //       $lookup: {
    //         from: "hospitals_clinics",
    //         localField: "hospital_clinic_id",
    //         foreignField: "_id",
    //         as: "hospital_clinic",
    //       },
    //     },
    //     {
    //       $unwind: "$hospital_clinic",
    //     },
    //     {
    //       $addFields: {
    //         patient_name: "$patient.patient_name",
    //         doctor_name: "$doctor.doctor_name",
    //         hospital_clinic_name: "$hospital_clinic.hospital_clinic_name",
    //       },
    //     },
    //     {
    //       $project: {
    //         patient: 0,
    //         doctor: 0,
    //         hospital_clinic: 0,
    //       },
    //     },
    //   ])
    //   .limit(Number(limit))
    //   .toArray();

    return res.json(medical_list);
  }
);

//3
//All Medical Records by single Doctor at Hospitals/Cinics By Name Endpoint
app.get(
  "/list_of_medical_records_of_all_patients_that_doctor_assigned_at_hospital_by_name_and_time",
  doctor_auth,
  async function (req, res) {
    const { doctor_id, hospital_clinic_id, patient_name, date, limit } =
      req.body;

    if (!doctor_id || !hospital_clinic_id || !patient_name || !date || !limit) {
      return res.status(400).json({ msg: "required: something !!!" });
    }

    const data = await patients
      .aggregate([
        {
          $match: { patient_name: patient_name },
        },
        {
          $lookup: {
            from: "medical_records",
            localField: "patient_medical_records",
            foreignField: "_id",
            as: "patient_medical_records",
          },
        },
      ])
      .limit(Number(limit))
      .toArray();

    return res.json(data[0].patient_medical_records);
  }
);

//4
//Single Detail Medical Record by Doctor at Hospitals/Cinics Endpoint
app.get(
  "/single_medical_record_of_patient_doctor_assigned_hospital",
  doctor_auth,
  async function (req, res) {
    const { _id, doctor_id, hospital_clinic_id, patient_id, limit } = req.body;

    const data = await medical_records
      .aggregate([
        {
          $match: {
            _id: new ObjectId(_id),
            patient_id: new ObjectId(patient_id),
            doctor_id: new ObjectId(doctor_id),
            hospital_clinic_id: new ObjectId(hospital_clinic_id),
          },
        },
        {
          $lookup: {
            from: "patients",
            localField: "patient_id",
            foreignField: "_id",
            as: "patient",
          },
        },
        {
          $unwind: "$patient",
        },
        {
          $lookup: {
            from: "doctors",
            localField: "doctor_id",
            foreignField: "_id",
            as: "doctor",
          },
        },
        {
          $unwind: "$doctor",
        },
        {
          $lookup: {
            from: "hospitals_clinics",
            localField: "hospital_clinic_id",
            foreignField: "_id",
            as: "hospital_clinic",
          },
        },
        {
          $unwind: "$hospital_clinic",
        },
        {
          $addFields: {
            patient_name: "$patient.patient_name",
            doctor_name: "$doctor.doctor_name",
            hospital_clinic_name: "$hospital_clinic.hospital_clinic_name",
          },
        },
        {
          $project: {
            patient: 0,
            doctor: 0,
            hospital_clinic: 0,
          },
        },
      ])
      .limit(Number(limit))
      .toArray();

    return res.json(data);
  }
);

//Detail page of patient medical history
app.get("/patient-medical-history/:id", doctor_auth, async function (req, res) {
  const { id } = req.params;

  const data = await patients.findOne({ _id: new ObjectId(id) });

  delete data.visited_doctor_list;
  delete data.visited_hospital_clinic_list;
  delete data.patient_password;

  return res.json(data);
});

//Recent N-Medical Records of a Patient
app.get("/recent_medical_records", doctor_auth, async function (req, res) {
  const { patient_id, hospital_clinic_id, limit } = req.body;

  const data = await medical_records
    .find({
      patient_id: new ObjectId(patient_id),
      hospital_clinic_id: new ObjectId(hospital_clinic_id),
    })
    .limit(Number(limit))
    .toArray();

  return res.json(data);
});

//Add medical record for a patient
app.post("/medical_records", doctor_auth, async function (req, res) {
  const {
    patient_id,
    doctor_id,
    hospital_clinic_id,
    illeness_name,
    cause_of_illeness,
    patient_blood_pressure,
    patient_oxygen_level,
    patient_heart_rate,
    patient_body_temperature,
    doctor_recommendation,
    doctor_medication_list,
  } = req.body;

  try {
    //checking the data
    if (
      !patient_id ||
      !doctor_id ||
      !hospital_clinic_id ||
      !illeness_name ||
      !cause_of_illeness ||
      !patient_blood_pressure ||
      !patient_oxygen_level ||
      !patient_heart_rate ||
      !patient_body_temperature ||
      !doctor_recommendation ||
      !doctor_medication_list
    ) {
      return res.status(400).json({ msg: "required: something !!!" });
    }

    const medical_record_data = {
      record_created_date: new Date("YYYY-MM-DD"),
      patient_id: new ObjectId(patient_id),
      doctor_id: new ObjectId(doctor_id),
      hospital_clinic_id: new ObjectId(hospital_clinic_id),
      illeness_name: illeness_name,
      cause_of_illeness: cause_of_illeness,
      patient_blood_pressure: patient_blood_pressure,
      patient_oxygen_level: patient_oxygen_level,
      patient_heart_rate: patient_heart_rate,
      patient_body_temperature: patient_body_temperature,
      doctor_recommendation: doctor_recommendation,
      doctor_medication_list: doctor_medication_list,
      created_time:new Date().toLocaleString(),
    };

    const result = await medical_records.insertOne(medical_record_data);

    //here add newly created ID of a medical record to the Patient Profile's Patient Medical Record Array
    await patients.updateOne(
      { _id: new ObjectId(patient_id) },
      { $push: { patient_medical_records: new ObjectId(result.insertedId) } }
    );

     await patients.updateOne(
       { _id: new ObjectId(patient_id) },
       { $push: { visited_doctor_list: new ObjectId(doctor_id) } }
     );

      await patients.updateOne(
        { _id: new ObjectId(patient_id) },
        { $push: { visited_hospital_clinic_list: new ObjectId(hospital_clinic_id) } }
      );

      await doctors.updateOne(
        { _id: new ObjectId(doctor_id) },
        {
          $push: {
            patient_list: new ObjectId(patient_id),
          },
        }
      );

      await hospitals_clinics.updateOne(
        { _id: new ObjectId(hospital_clinic_id) },
        {
          $push: {
            patient_list: new ObjectId(patient_id),
          },
        }
      );




    return res.status(201).json(result);
  } catch (error) {
    return res.status(401).json({ msg: err.message });
  }
});

//Doctor Profile Endpoint
app.get("/doctors/:id", doctor_auth, async function (req, res) {
  const { id } = req.params;

  const data = await doctors.findOne({ _id: new ObjectId(id) });
  delete data.doctor_password;

  return res.json(data);
});

//Doctor Email Edit Endpoint
app.put("/doctors-email/:id", doctor_auth, async function (req, res) {
  const { id } = req.params;
  const { new_email } = req.body;

  if (!new_email) {
    return res.status(400).json({ msg: "required: something !!!" });
  }

  try {
    const updateddata = await doctors.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { doctor_email: new_email },
      }
    );

    return res.status(201).json(updateddata);
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

//Doctor Password Edit Endpoint
app.put("/doctors-password/:id", doctor_auth, async function (req, res) {
  const { id } = req.params;
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ msg: "Required: Something !!!" });
  }

  const user = await doctors.findOne({ _id: new ObjectId(id) });

  if (await bcrypt.compare(old_password, user.doctor_password)) {
    if (await bcrypt.compare(new_password, user.doctor_password)) {
      return res.status(400).json({ msg: "Try Different Password !!!" });
    }

    //hashing the password
    let hashed_new_password = await bcrypt.hash(new_password, 10);

    try {
      const updateddata = await doctors.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { doctor_password: hashed_new_password },
        }
      );

      return res.status(201).json(updateddata);
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  } else {
    return res.status(500).json({ msg: "Try correct password" });
  }
});





// =================================== Hospital/Clinics Endpoints  =================================== //

const hospital_auth = function (req, res, next) {
  const { authorization } = req.headers;
  const token = authorization && authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Token required" });
  }

  try {
    let user = jwt.verify(token, secret_hospital_clinic);
    res.locals.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ msg: err.message });
  }
};

//hospital/clinic login endpoint
app.post("/hospital_clinic_login", async function (req, res) {
  const { hospital_clinic_email, password } = req.body;

  if (!hospital_clinic_email || !password) {
    return res.status(400).json({ msg: "required: email or password !!!" });
  }

  try {
    const user = await hospitals_clinics.findOne({ hospital_clinic_email });

    if (user) {
      const result = await bcrypt.compare(
        password,
        user.hospitals_clinics_password
      );

      if (result) {
        const token = jwt.sign(user, secret_hospital_clinic);
        return res.status(201).json({ token, user });
      }
    }

    return res.status(403).json({ msg: "Incorrect email or password !!!" });
  } catch (e) {
    return res.status(500).json({ msg: e.message });
  }
});


//Available doctors list Endpoint
app.get(
  "/available_doctors_list/:id",
  hospital_auth,
  async function (req, res) {
    const { id } = req.params;

    //To get doctor ID and Name
    const data_doctors = await hospitals_clinics
      .aggregate([
        {
          $match: {
            _id: new ObjectId(id),
          },
        },
        {
          $lookup: {
            from: "doctors",
            localField: "available_doctor_list",
            foreignField: "_id",
            as: "doctors",
          },
        },
      ])
      .limit(Number(1))
      .toArray();

    delete data_doctors[0].hospital_password;
    delete data_doctors[0].hospital_clinic_address;
    delete data_doctors[0].hospital_clinic_name;
    delete data_doctors[0].hospital_clinic_email;
    delete data_doctors[0].hospital_clinic_phone;
    delete data_doctors[0].hospital_clinic_address;
    delete data_doctors[0].available_doctor_list;
    delete data_doctors[0].patient_list;

    //console.log(data_doctors[0].doctors);
    let format_1 = data_doctors[0].doctors;

    if (format_1) {
      format_1 = format_1.map((available_doctor) => {
        available_doctor = {
          doctor_id: available_doctor._id,
          doctor_name: available_doctor.doctor_name,
        };
        return available_doctor;
      });
    }

    return res.json(format_1);
  }
);

//Available patients list Endpoint
app.get(
  "/available_patients_list/:id",
  hospital_auth,
  async function (req, res) {
    const { id } = req.params;

    //To get patient ID and Name
    const data_patients = await hospitals_clinics
      .aggregate([
        {
          $match: {
            _id: new ObjectId(id),
          },
        },
        {
          $lookup: {
            from: "patients",
            localField: "patient_list",
            foreignField: "_id",
            as: "patients",
          },
        },
      ])
      .limit(Number(1))
      .toArray();

    delete data_patients[0].hospital_password;
    delete data_patients[0].hospital_clinic_address;
    delete data_patients[0].hospital_clinic_name;
    delete data_patients[0].hospital_clinic_email;
    delete data_patients[0].hospital_clinic_phone;
    delete data_patients[0].hospital_clinic_address;
    delete data_patients[0].available_doctor_list;
    delete data_patients[0].patient_list;

    let format_2 = data_patients[0].patients;

    if (format_2) {
      format_2 = format_2.map((patient) => {
        patient = {
          patient_id: patient._id,
          patient_name: patient.patient_name,
        };
        return patient;
      });
    }

    return res.json(format_2);
  }
);

//Search Medical Record by Patient Name and Doctor Name 
app.get(
  "/list_of_medical_records_by_patient_and_doctor",
  hospital_auth,
  async function (req, res) {
    const { patient_id, doctor_id, hospital_clinic_id, limit } = req.body;

    if (!patient_id || !doctor_id || !hospital_clinic_id || !limit) {
      return res.status(400).json({ msg: "required: something !!!" });
    }

    let medical_list = await medical_records
      .aggregate([
        {
          $match: {
            patient_id: new ObjectId(patient_id),
            doctor_id: new ObjectId(doctor_id),
            hospital_clinic_id: new ObjectId(hospital_clinic_id),
          },
        },
      ])
      .limit(Number(limit))
      .toArray();

    return res.json(medical_list);
  }
);

//Doctor Profile Detail Page Endpoint
app.get("/doctor_profile/:id", hospital_auth, async function (req, res) {
  const { id } = req.params;

  const data = await doctors.findOne({ _id: new ObjectId(id) });
  delete data.doctor_password;

  return res.json(data);
});

//Patient Profile Detail Page Endpoint
app.get("/patient_profile/:id", hospital_auth, async function (req, res) {
  const { id } = req.params;

  const data = await patients.findOne({ _id: new ObjectId(id) });
  delete data.patient_password;

  return res.json(data);
});

//Hospital-Clinic Profile Endpoint
app.get(
  "/hospital_clinic_profile/:id",
  hospital_auth,
  async function (req, res) {
    const { id } = req.params;

    const data = await hospitals_clinics.findOne({ _id: new ObjectId(id) });

    delete data.available_doctor_list;
    delete data.patient_list;
    delete data.hospital_password;
    delete data.hospitals_clinics_password;

    return res.json(data);
  }
);


//Register a patient and Add a patient to Hospital's patient_list
//Single Patient Register Endpoint
//updated
app.post(
  "/hospital_clinic_add_patient/:id",
  hospital_auth,
  async function (req, res) {
    const { id } = req.params;
    const {
      nrc,
      name,
      email,
      phone,
      address,
      dob,
      sex,
      height,
      weight,
      password,
    } = req.body;

    //checking the data
    if (
      !nrc ||
      !name ||
      !email ||
      !phone ||
      !address ||
      !dob ||
      !sex ||
      !height ||
      !weight ||
      !password
    ) {
      return res.status(400).json({ msg: "required: something !!!" });
    }

    //hashing the password
    let hashed_password = await bcrypt.hash(password, 10);

    const age_finder = (dob) => {
      const age = new Date().getFullYear() - Number(dob);
      return age;
    };

    const user_data = {
      patient_nrc: nrc,
      patient_name: name,
      patient_email: email,
      patient_phone: phone,
      patient_dob: dob,
      patient_age: age_finder(dob),
      patient_sex: sex,
      patient_height: height,
      patient_weight: weight,
      patient_address: address || "",
      allergic_history: [],
      medical_history: [],
      visited_doctor_list: [],
      visited_hospital_clinic_list: [],
      patient_password: hashed_password,
      role: "patient",
      patient_medical_records: [],
    };

    const result = await patients.insertOne(user_data);

    const patient_id = result.insertedId;

      
         //add patient_id to hospital's  patient list
         await hospitals_clinics.updateOne(
           { _id: new ObjectId(id) },
           { $addToSet: { patient_list: new ObjectId(patient_id) } }
         );
         //add patient_id to hospital' stransaction_track patient list
         await transaction_track.updateOne(
           { hospital_id: new ObjectId(id) },
           {
             $addToSet: {
               patient_list: new Object({
                 patient_id: new ObjectId(patient_id),
                 inserted_time: new Date().toLocaleDateString(),
               }),
             },
           }
         );
     

    // const data = await hospitals_clinics.updateOne(
    //   { _id: new ObjectId(id) },
    //   { $addToSet: { patient_list: new ObjectId(patient_id) } }
    // );

    return res.status(201).json(data);
  }
);

//Register a doctor and Add a doctor to Hospital's available_doctor_list
//Single Doctor Register Endpoint
//updated
app.post(
  "/hospital_clinic_add_doctor/:id",
  hospital_auth,
  async function (req, res) {
    const { id } = req.params;

    const { nrc, name, email, phone, qualification, specialty, password } =
      req.body;

    //checking the data
    if (
      !nrc ||
      !name ||
      !email ||
      !phone ||
      !qualification ||
      !specialty ||
      !password
    ) {
      return res.status(400).json({ msg: "required: something !!!" });
    }

    //hashing the password
    let hashed_password = await bcrypt.hash(password, 10);

    const doctor_data = {
      doctor_nrc: nrc,
      doctor_name: name,
      doctor_email: email,
      doctor_phone: phone,
      doctor_qualification: qualification,
      doctor_specialty: specialty,
      assigned_clinic_hospital: [],
      patient_list: [],
      doctor_password: hashed_password,
    };

    const result = await doctors.insertOne(doctor_data);

    const doctor_id = result.insertedId;

    
      //add doctor_id to hospital's available doctor list
      const data = await hospitals_clinics.updateOne(
        { _id: new ObjectId(id) },
        { $addToSet: { available_doctor_list: new ObjectId(doctor_id) } }
      );
      //add doctor_id to hospital' stransaction_track doctor  list
      await transaction_track.updateOne(
        { hospital_id: new ObjectId(id) },
        {
          $addToSet: {
            doctor_list: new Object({
              doctor_id: new ObjectId(doctor_id),
              inserted_time: new Date().toLocaleDateString(),
            }),
          },
        }
      );
  
    return res.status(201).json(result);
  }
);


//Add Doctor to your hospital System
app.post(
  "/add_doctor_account_to_hospital/:id",
  hospital_auth,
  async function (req, res) {
    const { id } = req.params;

    const { doctor_id } = req.body;

    try {
        await hospitals_clinics.updateOne(
          { _id: new ObjectId(id) },
          {
            $addToSet: {
              available_doctor_list: new ObjectId(doctor_id),
            },
          }
        );

        const result = await transaction_track.updateOne(
          { hospital_id: new ObjectId(id) },
          {
            $addToSet: {
              doctor_list: new Object({
                doctor_id: new ObjectId(doctor_id),
                inserted_time: new Date().toLocaleDateString(),
              }),
            },
          }
        );

        return res.status(201).json(result);
    } catch (error) {
        return res.status(401).json({ msg: "Doctor is not in clinica system" });
    }
  }
);

//Add Patient to your hospital System
app.post(
  "/add_patient_account_to_hospital/:id",
  hospital_auth,
  async function (req, res) {
    const { id } = req.params;

    const { patient_id } = req.body;

    try {
      await hospitals_clinics.updateOne(
        { _id: new ObjectId(id) },
        {
          $addToSet: {
            patient_list: new ObjectId(patient_id),
          },
        }
      );

      const result = await transaction_track.updateOne(
        { hospital_id: new ObjectId(id) },
        {
          $addToSet: {
            patient_list: new Object({
              patient_id: new ObjectId(patient_id),
              inserted_time: new Date().toLocaleDateString(),
            }),
          },
        }
      );

      return res.status(201).json(result);
    } catch (error) {
      return res.status(401).json({ msg: "Patient is not in clinica system" });
    }

  }
);



//Hospital/Clinic Email Edit Endpoint
app.put("/hospital-clinic-email/:id", async function (req, res) {
  const { id } = req.params;
  const { new_email } = req.body;

  if (!new_email) {
    return res.status(400).json({ msg: "required: something !!!" });
  }

  try {
    const updateddata = await hospitals_clinics.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: { hospital_clinic_email: new_email },
      }
    );

    return res.status(201).json(updateddata);
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }
});

//Doctor Password Edit Endpoint
app.put("/hospital-clinic-password/:id", async function (req, res) {
  const { id } = req.params;
  const { old_password, new_password } = req.body;

  if (!old_password || !new_password) {
    return res.status(400).json({ msg: "Required: Something !!!" });
  }

  const user = await hospitals_clinics.findOne({ _id: new ObjectId(id) });

  if (await bcrypt.compare(old_password, user.hospitals_clinics_password)) {
    if (await bcrypt.compare(new_password, user.hospitals_clinics_password)) {
      return res.status(400).json({ msg: "Try Different Password !!!" });
    }

    //hashing the password
    let hashed_new_password = await bcrypt.hash(new_password, 10);

    try {
      const updateddata = await hospitals_clinics.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: { hospitals_clinics_password: hashed_new_password },
        }
      );

      return res.status(201).json(updateddata);
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  } else {
    return res.status(500).json({ msg: "Try correct password" });
  }
});








// =================================== Medical Record Endpoints  =================================== //

//Single hospital-Clinic Endpoint
app.get("/medical_records/:id", async function (req, res) {
  const { id } = req.params;

  const data = await medical_records.findOne({ _id: new ObjectId(id) });
  console.log(data);
  return res.json(data);
});

//Create Single hospital-Clinic Endpoint
app.post("/medical_records", async function (req, res) {
  const {
    patient_id,
    doctor_id,
    hospital_clinic_id,
    illeness_name,
    cause_of_illeness,
    patient_blood_pressure,
    patient_oxygen_level,
    patient_heart_rate,
    patient_body_temperature,
    doctor_recommendation,
    doctor_medication_list,
  } = req.body;

  //checking the data
  if (
    !patient_id ||
    !doctor_id ||
    !hospital_clinic_id ||
    !illeness_name ||
    !cause_of_illeness ||
    !patient_blood_pressure ||
    !patient_oxygen_level ||
    !patient_heart_rate ||
    !patient_body_temperature ||
    !doctor_recommendation ||
    !doctor_medication_list
  ) {
    return res.status(400).json({ msg: "required: something !!!" });
  }

  const medical_record_data = {
    record_created_date: new Date("YYYY-MM-DD"),
    patient_id: new ObjectId(patient_id),
    doctor_id: new ObjectId(doctor_id),
    hospital_clinic_id: new ObjectId(hospital_clinic_id),
    illeness_name: illeness_name,
    cause_of_illeness: cause_of_illeness,
    patient_blood_pressure: patient_blood_pressure,
    patient_oxygen_level: patient_oxygen_level,
    patient_heart_rate: patient_heart_rate,
    patient_body_temperature: patient_body_temperature,
    doctor_recommendation: doctor_recommendation,
    doctor_medication_list: doctor_medication_list,
    created_time:new Date().toLocaleString(),
  };

  const result = await medical_records.insertOne(medical_record_data);

  return res.status(201).json(result);
});

//Single hospital-Clinic Delete Endpoint
app.get("/medical_records/:id", async function (req, res) {
  const { id } = req.params;

  const data = await medical_records.deleteOne({ _id: new ObjectId(id) });
  console.log(data);
  return res.json(data);
});





// =================================== Admin Endpoints =================================== //
const admin_auth = function (req, res, next) {
  const { authorization } = req.headers;
  const token = authorization && authorization.split(" ")[1];

  if (!token) {
    return res.status(401).json({ msg: "Token required" });
  }

  try {
    let user = jwt.verify(token, secret_admin);
    res.locals.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ msg: err.message });
  }
};

//Admin login endpoint
app.post("/admin_login", async function (req, res) {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ msg: "required: email or password !!!" });
  }

  try {
    const user = await admin.findOne({ admin_email:email });

    if (user) {
      const result = await bcrypt.compare(
        password,
        user.admin_password
      );

      if (result) {
        const token = jwt.sign(user, secret_admin);
        return res.status(201).json({ token, user });
      }
    }

    return res.status(403).json({ msg: "Incorrect email or password !!!" });
  } catch (e) {
    return res.status(500).json({ msg: e.message });
  }
});

//Admin register endpoint
//Create Admin
app.post("/admin_register", async function (req, res) {
  const { email, password } = req.body;

  //checking the data
  if (!email || !password) {
    return res.status(400).json({ msg: "required: something !!!" });
  }

  //hashing the password
  let hashed_password = await bcrypt.hash(password, 10);

  const admin_data = {
    admin_email: email,
    admin_password: hashed_password,
  };

  const result = await admin.insertOne(admin_data);

  return res.status(201).json(result);
});

app.post("/patients",admin_auth, async function (req, res) {
  const {
    nrc,
    name,
    email,
    phone,
    address,
    dob,
    sex,
    height,
    weight,
    password,
  } = req.body;

  //checking the data
  if (
    !nrc ||
    !name ||
    !email ||
    !phone ||
    !address ||
    !dob ||
    !sex ||
    !height ||
    !weight ||
    !password
  ) {
    return res.status(400).json({ msg: "required: something !!!" });
  }

  //hashing the password
  let hashed_password = await bcrypt.hash(password, 10);

  const age_finder = (dob) => {
    const age=new Date().getFullYear() - Number(dob);
    return age;
  };

  const user_data = {
    patient_nrc: nrc,
    patient_name: name,
    patient_email: email,
    patient_phone: phone,
    patient_dob: dob,
    patient_age: age_finder(dob),
    patient_sex: sex,
    patient_height: height,
    patient_weight: weight,
    patient_address: address || "",
    allergic_history: [],
    medical_history: [],
    visited_doctor_list: [],
    visited_hospital_clinic_list: [],
    patient_password: hashed_password,
    role: "patient",
    patient_medical_records: [],
    created_time:new Date().toLocaleString(),
  };

  const result = await patients.insertOne(user_data);

  return res.status(201).json(result);
});


//All Users Endpoint
app.get("/patients",admin_auth, async function (req, res) {
  const data = await patients.find().limit(20).toArray();
  console.log(data);
  return res.json(data);
});

//Single User Endpoint
app.get("/patients/:id",admin_auth, async function (req, res) {
  const { id } = req.params;

  const data = await patients.findOne({ _id: new ObjectId(id) });
  console.log(data);
  return res.json(data);
});

//find patient by name 
app.get("/patients", async function (req, res) {
  const { name } = req.body;

  const data = await patients.findOne({ patient_name: name });
  return res.json(data);
});

//Single User Delete Endpoint
app.put("/patients/:id", admin_auth, async function (req, res) {
  const { id } = req.params;

  const result = await patients.deleteOne({ _id: new ObjectId(id) });

  return res.status(201).json(result);
});

//All Medical Record Endpoints
app.get("/medical_records", admin_auth, async function (req, res) {
  const data = await medical_records.find().limit(20).toArray();
  console.log(data);
  return res.json(data);
});


//All Medical Record by Patient Name Endpoints
app.get("/medical_records_by_patient_name", admin_auth, async function (req, res) {
  
  const { name }=req.body;

  const patient_data = await patients
    .aggregate([
      {
        $match: {
          patient_name: name,
        },
      },
      {
        $lookup: {
          from: "medical_records",
          localField: "patient_medical_records",
          foreignField: "_id",
          as: "patient_medical_records",
        },
      },
    ])
    .limit(20)
    .toArray();

  return res.json(patient_data);
});


//Single Doctor Register at SuperAdmin Endpoint
app.post("/doctors", admin_auth, async function (req, res) {
  const { nrc, name, email, phone, qualification, specialty, password } =
    req.body;

  //checking the data
  if (
    !nrc ||
    !name ||
    !email ||
    !phone ||
    !qualification ||
    !specialty ||
    !password
  ) {
    return res.status(400).json({ msg: "required: something !!!" });
  }

  //hashing the password
  let hashed_password = await bcrypt.hash(password, 10);

  const doctor_data = {
    doctor_nrc: nrc,
    doctor_name: name,
    doctor_email: email,
    doctor_phone: phone,
    doctor_qualification: qualification,
    doctor_specialty: specialty,
    assigned_clinic_hospital: [],
    patient_list: [],
    doctor_password: hashed_password,
    created_time:new Date().toLocaleString(),
  };

  const result = await doctors.insertOne(doctor_data);

  return res.status(201).json(result);
});

//All doctors Endpoint
app.get("/doctors", admin_auth, async function (req, res) {
  const data = await doctors.find().limit(20).toArray();
  console.log(data);
  return res.json(data);
});

//Single Doctor Endpoint
app.get("/doctors/:id", admin_auth, async function (req, res) {
  const { id } = req.params;

  const data = await doctors.findOne({ _id: new ObjectId(id) });
  console.log(data);
  return res.json(data);
});

//Doctor By Name Endpoint
app.get("/doctors_name", admin_auth, async function (req, res) {
  const { name } = req.body;

  const data = await doctors.findOne({ doctor_name: name });

  return res.json(data);
});

//Single Doctor Delete Endpoint
app.put("/doctors/:id", admin_auth, async function (req, res) {
  const { id } = req.params;

  const result = await doctors.deleteOne({ _id: new ObjectId(id) });

  return res.status(201).json(result);
});


//All hospital-Clinic Endpoint
app.get("/hospital_clinic", admin_auth, async function (req, res) {
  const data = await hospitals_clinics.find().limit(20).toArray();
  console.log(data);
  return res.json(data);
});

//Single hospital-Clinic Endpoint
app.get("/hospital_clinic/:id", admin_auth, async function (req, res) {
  const { id } = req.params;

  const data = await hospitals_clinics.findOne({ _id: new ObjectId(id) });
  console.log(data);
  return res.json(data);
});

// hospital-Clinic by name Endpoint
app.get("/hospital_clinic_name", admin_auth, async function (req, res) {
  const { name } = req.body;

  const data = await hospitals_clinics.findOne({ hospital_clinic_name: name });

  return res.json(data);
});

//Single hospital-Clinic Delete Endpoint
app.get("/hospital_clinic/:id", admin_auth, async function (req, res) {
  const { id } = req.params;

  const data = await hospitals_clinics.deleteOne({ _id: new ObjectId(id) });
  console.log(data);
  return res.json(data);
});

//Create Single hospital-Clinic Endpoint by Admin
//admin_auth,
app.post("/hospital_clinic", admin_auth, async function (req, res) {
  const { name, email, phone, address, password } = req.body;

  //checking the data
  if (!name || !email || !phone || !address || !password) {
    return res.status(400).json({ msg: "required: something !!!" });
  }

  //hashing the password
  let hashed_password = await bcrypt.hash(password, 10);

  const hospital_clinic_data = {
    hospital_clinic_name: name,
    hospital_clinic_email: email,
    hospital_clinic_phone: phone,
    hospital_clinic_address: address,
    available_doctor_list: [],
    patient_list: [],
    hospitals_clinics_password: hashed_password,
    created_time:new Date().toLocaleString(),
  };

  const result = await hospitals_clinics.insertOne(hospital_clinic_data);

 
  try {
      const hospital_clinic_transaction = {
        hospital_id: new ObjectId(result.insertedId),
        doctor_list: [],
        patient_list: [],
      };
      await transaction_track.insertOne(hospital_clinic_transaction);
  } catch (error) {
    return res.status(401).json({msg:error.message});
  }

 

  return res.status(201).json(result);
});



// =================================== Starting the server ===================================
app.listen(8888, () => {
  console.log("API server running at http://localhost:8888");
});
