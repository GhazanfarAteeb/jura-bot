module.exports = {
  sharding: true,
  database: false,
  nodes: [
    {
      host: "ec2-3-109-121-14.ap-south-1.compute.amazonaws.com",
      port: 2333,
      password: "youshallnotpass",
      secure: false
    }
  ]
}