import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AngularFireStorage } from '@angular/fire/storage';
import { Observable } from 'rxjs/Observable';
import { finalize } from 'rxjs/operators';
import { CarteleraService } from '../../../services/cartelera.service';
import { ToasterService } from '../../../services/toaster.service';
import { LocalStorageService } from '../../../services/local-storage.service';
import { Router } from '@angular/router';
import { Cartelera } from '../../../models/cartelera';

@Component({
    selector: 'info-create-cartelera',
    templateUrl: './create-cartelera.component.html',
    styleUrls: ['./create-cartelera.component.scss']
})
export class CreateCarteleraComponent implements OnInit {

    createCarteleraForm: FormGroup;
    imageUrl: string;
    submitted = false;
    loading = false;
    loaded = false;
    uploadProgress: Observable<number>;
    uploadUrl: Observable<string>;

    constructor(private carteleraService: CarteleraService,
                private toasterService: ToasterService,
                private formBuilder: FormBuilder,
                private fireStorage: AngularFireStorage,
                private router: Router,
                public localStorageService: LocalStorageService) { }

    ngOnInit() {
        this.createCarteleraForm = this.formBuilder.group({
            title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
            description: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(1000)]],
            image: ['']
        });
    }

    get form() {
        return this.createCarteleraForm.controls;
    }

    createCartelera() {
        this.submitted = true;
        if (this.createCarteleraForm.valid) {
            let formData = this.createCarteleraForm.value;
            formData.created_by = `users/${this.localStorageService.getUserId()}`;
            if (this.imageUrl == undefined)
                formData.image = '../../../../assets/cartelera.jpg';
            else
                formData.image = this.imageUrl;
            this.carteleraService.postCartelera(formData)
                .subscribe(
                    (newBillboard: Cartelera) => {
                        this.router.navigateByUrl('/home');
                        this.toasterService.success('Cartelera creada con éxito !');
                        console.log(newBillboard);
                    },
                    (error) => {
                        this.toasterService.error('Ha ocurrido un error', 'La acción no ha podido realizarse');
                        console.error(error.message);
                    }
                );
        }
        else {
            return;
        }
    }

    upload(event) {

        this.loading = true;

        const file = event.target.files[0];

        const randomId = Math.random().toString(36).substring(2);

        const filepath = `images/${randomId}`;

        const fileRef = this.fireStorage.ref(filepath);

        const task = this.fireStorage.upload(filepath, file);

        this.uploadProgress = task.percentageChanges();

        task.snapshotChanges().pipe(
            finalize(() => {
                this.uploadUrl = fileRef.getDownloadURL();
                this.uploadUrl.subscribe((imageUrl) => this.imageUrl = imageUrl);
                this.loading = false;
                this.loaded = true;
            })
        ).subscribe();
    }

}
