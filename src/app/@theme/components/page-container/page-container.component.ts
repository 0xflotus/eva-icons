import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  ViewChild,
} from '@angular/core';
import {
  NbDialogService,
  NbMediaBreakpoint,
  NbMediaBreakpointsService,
  NbThemeService,
} from '@nebular/theme';
import { ActivatedRoute, Router } from '@angular/router';
import { fromEvent } from 'rxjs/internal/observable/fromEvent';

import { IconService, IconServiceData } from '../../../@core/data/icon.service';
import { debounceTime, delay, map, mergeMap, takeWhile, tap } from 'rxjs/operators';
import { DownloadIconComponent } from '../modals/download-icon/download-icon.component';

@Component({
  selector: 'eva-page-container',
  templateUrl: 'page-container.component.html',
  styleUrls: ['page-container.component.scss'],
})
export class PageContainerComponent implements AfterViewInit, OnDestroy {

  private alive = true;

  @ViewChild('searchInput') searchInput: ElementRef;
  @ViewChild('iconsBlock') iconsElement: ElementRef;

  @Input() iconsType: string;

  icons: string[] = [];
  message: string = '';
  breakpoint: NbMediaBreakpoint = { name: '', width: 0 };
  breakpoints: any;

  constructor(private iconService: IconService,
              private router: Router,
              private activatedRoute: ActivatedRoute,
              private dialogService: NbDialogService,
              private breakpointService: NbMediaBreakpointsService,
              private themeService: NbThemeService) {
    this.breakpoints = this.breakpointService.getBreakpointsMap();

    this.themeService.onMediaQueryChange()
      .pipe(takeWhile(() => this.alive))
      .subscribe(([oldValue, newValue]) => {
        this.breakpoint = newValue;
      });
  }

  ngAfterViewInit() {
    this.activatedRoute.queryParams
      .pipe(
        takeWhile(() => this.alive),
        delay(0),
        map(params => params.searchKey),
        tap((searchKeyValue: string) => {
          const inputValue = this.searchInput.nativeElement.value;

          if (!inputValue && searchKeyValue) {
            this.searchInput.nativeElement.value = searchKeyValue;
          }
        }),
        mergeMap((searchKeyValue: string) => {
          return searchKeyValue ?
            this.iconService.getFilteredIconsData(searchKeyValue, this.iconsType) :
            this.iconService.getIconsData(this.iconsType);
        }),
      )
      .subscribe((iconsData: IconServiceData) => {
        this.icons = iconsData.icons;
        this.message = iconsData.message;
      });

    fromEvent(this.searchInput.nativeElement, 'keyup')
      .pipe(
        takeWhile(() => this.alive),
        debounceTime(500),
      )
      .subscribe((event: any) => {
        const searchKeyValue = event.target.value;

        if (searchKeyValue) {
          this.router.navigate(
            [this.iconsType],
            { queryParams: { searchKey: searchKeyValue }});
        } else {
          const url = this.router.url.substring(0, this.router.url.indexOf('?'));

          this.router.navigateByUrl(url);
        }
      });
  }

  get noSearchResults() {
    return (
      this.message &&
      this.icons.length === 0
    );
  }

  get isLoading() {
    return (
      !this.message &&
      this.icons.length === 0
    );
  }

  get isMobileMode() {
    return this.breakpoint.width <= this.breakpoints.sm;
  }

  clickIcon(icon) {
    if (this.isMobileMode) {
      return;
    }

    const modalRef = this.dialogService.open(
      DownloadIconComponent,
      {
        hasBackdrop: true,
        backdropClass: 'download-icon',
        closeOnBackdropClick: true,
      },
    );
    const componentInstance = modalRef.componentRef.instance;

    componentInstance.selectedIcon = icon;
    componentInstance.iconType = this.iconsType;
  }

  ngOnDestroy() {
    this.alive = false;
  }
}
