var app = new Vue({
  el: '#app',
  data: {
    addedName: '',
    addedProblem: '',
    tickets: {},
  },
  created() {
    this.getTickets();
  },
  methods: {
    async getTickets() {
      try {
        let response = await axios.get("/api/tickets");
        this.tickets = response.data;
      } catch (error) {
        console.log(error);
      }
    },
    async addTicket() {
      try {
        let response = await axios.post("/api/tickets", {
          name: this.addedName,
          problem: this.addedProblem
        });
        this.addedName = "";
        this.addedProblem = "";
        this.getTickets();
      } catch (error) {
        console.log(error);
      }
    },
    async deleteTicket(ticket) {
      try {
        let response = await axios.delete("/api/tickets/" + ticket._id);
        this.getTickets();
      } catch (error) {
        console.log(error);
      }
    }
  }
});